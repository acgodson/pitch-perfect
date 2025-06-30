import { NextRequest, NextResponse } from "next/server";

const ELIZA_SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
const AGENT_NAME = process.env.NEXT_PUBLIC_AGENT_ID || "Beca";

/**
 * Get the agent UUID from ElizaOS by name
 */
async function getAgentUUID(agentName: string): Promise<string | null> {
  try {
    console.log(`[Voice Session API] Getting agent UUID for: ${agentName}`);

    const response = await fetch(`${ELIZA_SERVER_URL}/api/agents`);

    if (!response.ok) {
      console.error(
        `[Voice Session API] Failed to get agents: ${response.status}`,
      );
      return null;
    }

    const result = await response.json();
    const agents = result.data?.agents || [];

    // Find the agent by name
    const agent = agents.find((a: any) => a.name === agentName);

    if (agent && agent.id) {
      console.log(
        `[Voice Session API] Found agent UUID: ${agent.id} for name: ${agentName}`,
      );
      return agent.id;
    }

    console.error(`[Voice Session API] Agent not found: ${agentName}`);
    return null;
  } catch (error) {
    console.error("[Voice Session API] Error getting agent UUID:", error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const { sessionId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 },
      );
    }

    // Get the agent UUID
    const agentUUID = await getAgentUUID(AGENT_NAME);
    if (!agentUUID) {
      return NextResponse.json({ error: "Agent not found" }, { status: 500 });
    }

    console.log(
      `[API] Loading voice session: ${sessionId} for user: ${userId} and agent: ${agentUUID}`,
    );

    // Fetch the specific channel from ElizaOS
    const channelResponse = await fetch(
      `${ELIZA_SERVER_URL}/api/messaging/central-channels/${sessionId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!channelResponse.ok) {
      if (channelResponse.status === 404) {
        return NextResponse.json(
          { error: "Voice session not found" },
          { status: 404 },
        );
      }
      throw new Error("Failed to fetch channel from ElizaOS");
    }

    const channel = await channelResponse.json();
    const metadata = channel.metadata || {};

    // Verify this is a voice session for the correct user and agent
    const isForThisAgent = metadata.forAgent === agentUUID;
    const isUserAgentDM =
      (metadata.user1 === userId && metadata.user2 === agentUUID) ||
      (metadata.user1 === agentUUID && metadata.user2 === userId);
    const isVoiceSession = metadata.sessionType === "voice";

    if (!isForThisAgent || !isUserAgentDM || !isVoiceSession) {
      return NextResponse.json(
        { error: "Voice session not found or access denied" },
        { status: 404 },
      );
    }

    // Fetch messages for this channel
    const messagesResponse = await fetch(
      `${ELIZA_SERVER_URL}/api/messaging/central-channels/${sessionId}/messages?limit=100`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    let messages: any[] = [];
    if (messagesResponse.ok) {
      const messagesData = await messagesResponse.json();
      messages = messagesData.data?.messages || messagesData.messages || [];
    }

    // Get the last message for preview
    const lastMessage = messages[messages.length - 1];

    const voiceSession = {
      id: sessionId,
      channelId: sessionId,
      title: channel.name || "Voice Session",
      messageCount: messages.length,
      lastActivity:
        lastMessage?.timestamp || channel.createdAt || new Date().toISOString(),
      preview: lastMessage?.content || "No messages yet",
      isFromAgent: lastMessage?.authorId === agentUUID,
      createdAt:
        metadata.createdAt || channel.createdAt || new Date().toISOString(),
      userId: userId,
      agentId: agentUUID,
      sessionType: "voice" as const,
      metadata: metadata,
      messages: messages,
    };

    return NextResponse.json({
      success: true,
      data: voiceSession,
    });
  } catch (error) {
    console.error("[API] Error loading voice session:", error);
    return NextResponse.json(
      {
        error: "Failed to load voice session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
