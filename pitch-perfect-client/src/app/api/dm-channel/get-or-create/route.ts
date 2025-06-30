import { NextRequest, NextResponse } from "next/server";

const ELIZA_SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";

interface GetOrCreateDMChannelRequest {
  userId: string;
  agentId: string;
  sessionId?: string; // Optional session ID for deterministic channel creation
  initialMessage?: string; // Optional initial message for new sessions
}

interface DMChannelMetadata {
  isDm: true;
  user1: string;
  user2: string;
  forAgent: string;
  createdAt: string;
  sessionId?: string;
  initialMessage?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: GetOrCreateDMChannelRequest = await request.json();
    const { userId, agentId, sessionId, initialMessage } = body;

    if (!userId || !agentId) {
      return NextResponse.json(
        { error: "userId and agentId are required" },
        { status: 400 },
      );
    }

    // First, try to find an existing DM channel for this session if sessionId is provided
    if (sessionId) {
      try {
        const channelsResponse = await fetch(
          `${ELIZA_SERVER_URL}/api/messaging/central-channels`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (channelsResponse.ok) {
          const allChannels = await channelsResponse.json();

          // Look for existing channel with this EXACT session ID only
          const existingChannel = allChannels.find((channel: any) => {
            const metadata = channel.metadata || {};
            return channel.id === sessionId || metadata.sessionId === sessionId;
          });

          if (existingChannel) {
            console.log(
              "[DM Channel API] Found existing channel for session:",
              sessionId,
            );
            return NextResponse.json({
              success: true,
              channel: existingChannel,
              isNew: false,
            });
          }
        }
      } catch (error) {
        console.warn(
          "[DM Channel API] Error checking for existing channels:",
          error,
        );
        // Continue to create new channel
      }
    }

    // Create new DM channel
    const finalChannelId = sessionId || `dm-${userId}-${agentId}-${Date.now()}`;
    const channelName = `Chat - ${new Date().toLocaleString()}`;

    // Create DM channel metadata following official client pattern
    const metadata: DMChannelMetadata = {
      isDm: true,
      user1: userId,
      user2: agentId,
      forAgent: agentId,
      createdAt: new Date().toISOString(),
    };

    if (sessionId) {
      metadata.sessionId = sessionId;
    }

    if (initialMessage) {
      metadata.initialMessage = initialMessage;
    }

    console.log("[DM Channel API] Creating channel with ID:", finalChannelId);

    // Create the DM channel via ElizaOS API
    const createChannelResponse = await fetch(
      `${ELIZA_SERVER_URL}/api/messaging/central-channels`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: finalChannelId,
          name: channelName,
          server_id: "00000000-0000-0000-0000-000000000000", // Required server ID
          participantCentralUserIds: [userId, agentId], // Required field
          type: "DM", // Use DM type like the starter kit
          metadata: metadata,
        }),
      },
    );

    if (!createChannelResponse.ok) {
      const errorText = await createChannelResponse.text();
      console.error("[DM Channel API] Failed to create channel:", errorText);
      return NextResponse.json(
        { error: "Failed to create DM channel", details: errorText },
        { status: 500 },
      );
    }

    const channelData = await createChannelResponse.json();
    const actualChannelId = channelData.data?.id || finalChannelId;

    console.log("[DM Channel API] Channel creation response:", {
      requestedId: finalChannelId,
      returnedId: actualChannelId,
      match: finalChannelId === actualChannelId ? "YES" : "NO",
    });

    // If ElizaOS returned a different ID, we need to use the requested ID for consistency
    const channelIdToUse =
      finalChannelId === actualChannelId ? actualChannelId : finalChannelId;

    // Add agent to the channel as a participant using the /agents endpoint
    try {
      const addAgentResponse = await fetch(
        `${ELIZA_SERVER_URL}/api/messaging/central-channels/${channelIdToUse}/agents`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            agentId: agentId,
          }),
        },
      );

      if (!addAgentResponse.ok) {
        const errorText = await addAgentResponse.text();
        console.warn(
          "[DM Channel API] Failed to add agent to channel:",
          errorText,
        );
        // Continue anyway - agent might already be a participant
      } else {
        console.log("[DM Channel API] Successfully added agent to channel");
      }
    } catch (error) {
      console.warn("[DM Channel API] Error adding agent to channel:", error);
      // Continue anyway - this is not critical for channel creation
    }

    console.log("[DM Channel API] Channel created successfully:", {
      channelId: channelIdToUse,
      channelData: channelData,
      participants: channelData.participants || [],
      participantCentralUserIds: channelData.participantCentralUserIds || [],
    });

    // Verify the channel was created with the correct participants
    try {
      const verifyChannelResponse = await fetch(
        `${ELIZA_SERVER_URL}/api/messaging/central-channels/${channelIdToUse}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (verifyChannelResponse.ok) {
        const verifiedChannel = await verifyChannelResponse.json();
        console.log("[DM Channel API] Verified channel participants:", {
          channelId: channelIdToUse,
          participants: verifiedChannel.participants || [],
          participantCentralUserIds:
            verifiedChannel.participantCentralUserIds || [],
          isAgentParticipant:
            (verifiedChannel.participants || []).includes(agentId) ||
            (verifiedChannel.participantCentralUserIds || []).includes(agentId),
        });
      } else {
        console.warn("[DM Channel API] Could not verify channel participants");
      }
    } catch (error) {
      console.warn(
        "[DM Channel API] Error verifying channel participants:",
        error,
      );
    }

    return NextResponse.json({
      success: true,
      channel: {
        id: channelIdToUse, // Use the consistent channel ID
        name: channelName,
        type: "DM",
        metadata: metadata,
        participants: [userId, agentId],
        ...channelData,
      },
      isNew: true,
    });
  } catch (error) {
    console.error("[DM Channel API] Error in get-or-create DM channel:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
