import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
const AGENT_ID = process.env.NEXT_PUBLIC_AGENT_ID;

export async function POST(request: NextRequest) {
  try {
    let requestBody;

    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.error("[API] Failed to parse request body:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    const { userId, initialVoiceMessage } = requestBody || {};

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    if (!AGENT_ID) {
      return NextResponse.json(
        { error: "Agent ID not configured" },
        { status: 500 },
      );
    }

    // Generate a new voice session ID
    const sessionId = uuidv4();

    console.log(
      `[API] Creating new voice session: ${sessionId} for user: ${userId}`,
    );

    try {
      // Create DM channel for this voice session using get-or-create with sessionId
      const dmChannelResponse = await fetch(
        `http://localhost:4000/api/dm-channel/get-or-create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: userId,
            agentId: AGENT_ID,
            sessionId: sessionId, // This ensures it only finds channels with this exact sessionId
            initialMessage: initialVoiceMessage, // Pass the initial voice message to be stored in metadata
            sessionType: "voice", // Mark this as a voice session
          }),
        },
      );

      if (!dmChannelResponse.ok) {
        const errorText = await dmChannelResponse.text();
        console.error(
          `[API] Failed to create DM channel for voice session:`,
          errorText,
        );
        throw new Error(`Failed to create DM channel: ${errorText}`);
      }

      const dmChannelData = await dmChannelResponse.json();
      const channelId = dmChannelData.channel?.id;

      if (!channelId) {
        throw new Error("No channel ID returned from DM channel creation");
      }

      console.log(
        `[API] Created DM channel: ${channelId} for voice session: ${sessionId}`,
      );

      return NextResponse.json({
        success: true,
        data: {
          sessionId,
          channelId,
          userId,
          agentId: AGENT_ID,
          initialVoiceMessage,
          sessionType: "voice",
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error(
        "[API] Error creating DM channel for voice session:",
        error,
      );
      throw error;
    }
  } catch (error) {
    console.error("[API] Error creating voice session:", error);
    return NextResponse.json(
      {
        error: "Failed to create voice session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
