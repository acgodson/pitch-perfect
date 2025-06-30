import { NextRequest, NextResponse } from "next/server";

const ELIZA_SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
const AGENT_NAME = process.env.NEXT_PUBLIC_AGENT_ID || "Beca";

/**
 * Get the agent UUID from ElizaOS by name
 */
async function getAgentUUID(agentName: string): Promise<string | null> {
  try {
    console.log(`[Voice Sessions API] Getting agent UUID for: ${agentName}`);

    const response = await fetch(`${ELIZA_SERVER_URL}/api/agents`);

    if (!response.ok) {
      console.error(
        `[Voice Sessions API] Failed to get agents: ${response.status}`,
      );
      return null;
    }

    const result = await response.json();
    const agents = result.data?.agents || [];

    // Find the agent by name
    const agent = agents.find((a: any) => a.name === agentName);

    if (agent && agent.id) {
      console.log(
        `[Voice Sessions API] Found agent UUID: ${agent.id} for name: ${agentName}`,
      );
      return agent.id;
    }

    console.error(`[Voice Sessions API] Agent not found: ${agentName}`);
    return null;
  } catch (error) {
    console.error("[Voice Sessions API] Error getting agent UUID:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    // Get the agent UUID
    const agentUUID = await getAgentUUID(AGENT_NAME);
    if (!agentUUID) {
      return NextResponse.json({ error: "Agent not found" }, { status: 500 });
    }

    console.log(
      `[API] Fetching voice sessions for user: ${userId} and agent: ${agentUUID}`,
    );

    // Fetch all channels from ElizaOS
    const channelsResponse = await fetch(
      `${ELIZA_SERVER_URL}/api/messaging/central-channels`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!channelsResponse.ok) {
      throw new Error("Failed to fetch channels from ElizaOS");
    }

    const allChannels = await channelsResponse.json();

    // Filter for voice channels between this user and agent
    const voiceChannels = allChannels.filter((channel: any) => {
      const metadata = channel.metadata || {};

      // Check if this is a voice session for our agent
      const isForThisAgent = metadata.forAgent === agentUUID;

      // Check if this is a DM between our user and agent
      const isUserAgentDM =
        (metadata.user1 === userId && metadata.user2 === agentUUID) ||
        (metadata.user1 === agentUUID && metadata.user2 === userId);

      // Check if this is marked as a voice session
      const isVoiceSession = metadata.sessionType === "voice";

      return isForThisAgent && isUserAgentDM && isVoiceSession;
    });

    console.log(
      `[API] Found ${voiceChannels.length} voice channels for user ${userId} and agent ${agentUUID}`,
    );

    // Convert channels to voice sessions
    const voiceSessions = voiceChannels.map((channel: any) => {
      const metadata = channel.metadata || {};

      // Get the last message for preview
      const lastMessage = channel.messages?.[channel.messages.length - 1];

      return {
        id: channel.id,
        channelId: channel.id,
        title: channel.name || "Voice Session",
        messageCount: channel.messages?.length || 0,
        lastActivity:
          lastMessage?.timestamp ||
          channel.createdAt ||
          new Date().toISOString(),
        preview: lastMessage?.content || "No messages yet",
        isFromAgent: lastMessage?.authorId === agentUUID,
        createdAt:
          metadata.createdAt || channel.createdAt || new Date().toISOString(),
        userId: userId,
        agentId: agentUUID,
        sessionType: "voice" as const,
        metadata: metadata,
      };
    });

    // Sort by last activity (newest first)
    voiceSessions.sort(
      (a, b) =>
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime(),
    );

    return NextResponse.json({
      success: true,
      data: {
        sessions: voiceSessions,
      },
    });
  } catch (error) {
    console.error("[API] Error fetching voice sessions:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch voice sessions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
