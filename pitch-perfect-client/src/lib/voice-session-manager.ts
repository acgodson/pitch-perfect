import { v4 as uuidv4 } from "uuid";
import SocketIOManager from "./socketio-manager";

/**
 * Voice Session Manager
 * Handles voice session creation, loading, and management
 * Follows the same pattern as the chat system in the starter kit
 */

const VOICE_USER_ENTITY_KEY = "voice_user_entity";
const ELIZA_SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";

export interface VoiceSession {
  id: string;
  channelId: string;
  title: string;
  messageCount: number;
  lastActivity: string;
  preview: string;
  isFromAgent: boolean;
  createdAt: string;
  userId: string;
  agentId: string;
  sessionType: "voice";
  metadata?: any;
}

export interface VoiceSessionData {
  sessionId: string;
  channelId: string;
  userId: string;
  agentId: string;
  initialVoiceMessage?: string;
  sessionType: string;
  createdAt: string;
}

export interface VoiceRegistrationData {
  userName: string;
  phrases: string[];
  audioBuffers: string[];
}

export class VoiceSessionManager {
  private static instance: VoiceSessionManager | null = null;
  private socketManager: SocketIOManager;
  private activeSessionId: string | null = null;
  private entityId: string;
  private serverId: string;

  private constructor() {
    this.socketManager = SocketIOManager.getInstance();
    this.entityId = "11111111-1111-1111-1111-111111111111";
    this.serverId = "00000000-0000-0000-0000-000000000000";
  }

  public static getInstance(): VoiceSessionManager {
    if (!VoiceSessionManager.instance) {
      VoiceSessionManager.instance = new VoiceSessionManager();
    }
    return VoiceSessionManager.instance;
  }

  /**
   * Create a new voice session and ensure agent participation
   */
  async createSession(): Promise<string> {
    const sessionId = generateSessionId();
    this.activeSessionId = sessionId;

    console.log(`[VoiceSessionManager] Creating voice session: ${sessionId}`);

    // Create DM channel for routing
    const dmChannelId = await this.createDMChannel(sessionId);
    console.log(`[VoiceSessionManager] DM channel created: ${dmChannelId}`);

    // Set the active session channel ID in socket manager
    this.socketManager.setActiveSessionChannelId(dmChannelId);

    // Initialize socket connection and join channel
    this.socketManager.initialize(this.entityId, this.serverId);
    await this.socketManager.joinChannel(dmChannelId);

    return sessionId;
  }

  /**
   * Create a DM channel for routing purposes
   */
  private async createDMChannel(sessionId: string): Promise<string> {
    const response = await fetch("/api/dm-channel/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: this.entityId,
        agentId:
          process.env.NEXT_PUBLIC_AGENT_ID ||
          "fde21462-4177-054d-bb49-af260d0d95e9",
        channelId: sessionId,
        title: `Voice Session - ${sessionId}`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create DM channel: ${response.statusText}`);
    }

    const data = await response.json();
    return data.channel.id;
  }

  /**
   * Send a voice registration message
   */
  async sendVoiceRegistration(
    registrationData: VoiceRegistrationData,
  ): Promise<void> {
    if (!this.activeSessionId) {
      throw new Error("No active voice session");
    }

    const dmChannelId = this.socketManager.getActiveSessionChannelId();
    if (!dmChannelId) {
      throw new Error("No active session channel");
    }

    console.log(
      `[VoiceSessionManager] Sending voice registration to channel: ${dmChannelId}`,
    );

    // Send the registration message with proper metadata structure
    await this.socketManager.sendChannelMessage(
      "Voice registration request",
      dmChannelId,
      "voice_registration",
      dmChannelId,
      this.serverId,
      [], // attachments
      {
        source: "voice_registration",
        channelId: dmChannelId,
        targetAgentId:
          process.env.NEXT_PUBLIC_AGENT_ID ||
          "fde21462-4177-054d-bb49-af260d0d95e9",
        registrationData: {
          userName: registrationData.userName,
          audioFiles: registrationData.audioBuffers,
          phraseIndices: registrationData.phrases.map((_, index) => index),
          profileData: {
            timestamp: Date.now(),
            sessionId: this.activeSessionId,
          },
        },
        timestamp: Date.now(),
      },
    );
  }

  /**
   * Send a voice message
   */
  async sendVoiceMessage(
    audioData: string,
    messageType: "command" | "identification" = "command",
  ): Promise<void> {
    if (!this.activeSessionId) {
      throw new Error("No active voice session");
    }

    const dmChannelId = this.socketManager.getActiveSessionChannelId();
    if (!dmChannelId) {
      throw new Error("No active session channel");
    }

    console.log(
      `[VoiceSessionManager] Sending voice message (${messageType}) to channel: ${dmChannelId}`,
    );

    await this.socketManager.sendChannelMessage(
      `Voice ${messageType} request`,
      dmChannelId,
      "voice_message",
      dmChannelId,
      this.serverId,
      [], // attachments
      {
        source: "voice_message",
        channelId: dmChannelId,
        targetAgentId:
          process.env.NEXT_PUBLIC_AGENT_ID ||
          "fde21462-4177-054d-bb49-af260d0d95e9",
        messageData: {
          audioData,
          messageType,
          timestamp: Date.now(),
          sessionId: this.activeSessionId,
        },
        timestamp: Date.now(),
      },
    );
  }

  /**
   * Get the active session ID
   */
  getActiveSessionId(): string | null {
    return this.activeSessionId;
  }

  /**
   * End the current session
   */
  endSession(): void {
    if (this.activeSessionId) {
      console.log(
        `[VoiceSessionManager] Ending voice session: ${this.activeSessionId}`,
      );
      this.socketManager.clearActiveSessionChannelId();
      this.activeSessionId = null;
    }
  }

  /**
   * Get the socket manager for event listening
   */
  getSocketManager(): SocketIOManager {
    return this.socketManager;
  }
}

// Export singleton instance
export const voiceSessionManager = VoiceSessionManager.getInstance();

// Helper function
function generateSessionId(): string {
  return uuidv4();
}
