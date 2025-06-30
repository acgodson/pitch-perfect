import type { IAgentRuntime, Memory, Provider, State } from "@elizaos/core";
import { addHeader, logger } from "@elizaos/core";

/**
 * Conversation Context Provider for Voice Plugin
 * Provides conversation history and context for voice interactions
 * Integrates with session management system
 */
export const conversationContextProvider: Provider = {
  name: "CONVERSATION_CONTEXT",
  description: "Conversation history and context for voice interactions",

  get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    logger.debug("*** RETRIEVING CONVERSATION CONTEXT ***");

    try {
      // Get recent messages from the same room (session)
      const recentMessages = await runtime.getMemories({
        tableName: "messages",
        roomId: message.roomId,
        count: 15, // Last 15 messages for context
        unique: true,
      });

      if (recentMessages.length === 0) {
        logger.debug("No recent messages found for conversation context");
        return {
          data: { recentMessages: [], conversationContext: "" },
          values: {
            conversationContext: "",
            recentMessagesCount: 0,
            hasContext: false,
            sessionId: message.roomId, // Use roomId as sessionId
          },
          text: "",
        };
      }

      // Filter and format conversation messages
      const conversationMessages = recentMessages
        .filter((msg) => msg.id !== message.id) // Exclude current message
        .slice(-8) // Last 8 messages for context
        .map((msg) => {
          const isAgent = msg.entityId === runtime.agentId;
          const speaker = isAgent
            ? "Beca"
            : (msg.metadata as any)?.entityName || "User";
          const timestamp = new Date(msg.createdAt).toLocaleTimeString();
          const isVoiceMessage =
            (msg.metadata as any)?.source === "voice_recording";
          const voiceIndicator = isVoiceMessage ? "🎤 " : "";
          return `[${timestamp}] ${voiceIndicator}${speaker}: ${msg.content.text}`;
        });

      // Create conversation summary
      const conversationSummary = conversationMessages.join("\n");

      // Extract key topics and context
      const contextAnalysis = analyzeConversationContext(conversationMessages);

      // Get session metadata
      const sessionMetadata =
        (message.metadata as any)?.sessionId || message.roomId;

      const conversationText = addHeader(
        "# Recent Conversation Context",
        `Session: ${sessionMetadata}\n\n${conversationSummary}\n\n${contextAnalysis}`,
      );

      logger.debug("*** CONVERSATION CONTEXT RETRIEVED ***", {
        recentMessagesCount: conversationMessages.length,
        hasContext: conversationMessages.length > 0,
        roomId: message.roomId,
        sessionId: sessionMetadata,
      });

      return {
        data: {
          recentMessages: conversationMessages,
          conversationContext: conversationSummary,
          contextAnalysis,
          sessionId: sessionMetadata,
        },
        values: {
          conversationContext: conversationText,
          recentMessagesCount: conversationMessages.length,
          hasContext: conversationMessages.length > 0,
          conversationSummary,
          contextAnalysis,
          sessionId: sessionMetadata,
        },
        text: conversationText,
      };
    } catch (error) {
      logger.error("Error in conversation context provider:", error);

      const errorText = addHeader(
        "# Conversation Context",
        "Unable to retrieve conversation context due to an error.",
      );

      return {
        data: { error: error.message },
        values: {
          conversationContext: errorText,
          recentMessagesCount: 0,
          hasContext: false,
          conversationSummary: "",
          contextAnalysis: "",
          sessionId: message.roomId,
        },
        text: errorText,
      };
    }
  },
};

/**
 * Analyze conversation context to extract key information
 */
function analyzeConversationContext(messages: string[]): string {
  if (messages.length === 0) {
    return "No previous conversation context available.";
  }

  const analysis = [];

  // Count message types
  const userMessages = messages.filter((msg) => msg.includes("User:"));
  const agentMessages = messages.filter((msg) => msg.includes("Beca:"));
  const voiceMessages = messages.filter((msg) => msg.includes("🎤"));

  analysis.push(`Conversation Summary:`);
  analysis.push(`- Total messages: ${messages.length}`);
  analysis.push(`- User messages: ${userMessages.length}`);
  analysis.push(`- Agent responses: ${agentMessages.length}`);
  analysis.push(`- Voice messages: ${voiceMessages.length}`);

  // Extract recent topics
  const recentTopics = extractTopics(messages.slice(-3));
  if (recentTopics.length > 0) {
    analysis.push(`- Recent topics: ${recentTopics.join(", ")}`);
  }

  // Check for follow-up indicators
  const hasFollowUp = messages.some(
    (msg) =>
      msg.toLowerCase().includes("what about") ||
      msg.toLowerCase().includes("how about") ||
      msg.toLowerCase().includes("also") ||
      msg.toLowerCase().includes("too") ||
      msg.toLowerCase().includes("other"),
  );

  if (hasFollowUp) {
    analysis.push(`- This appears to be a follow-up question`);
  }

  // Check for voice-specific patterns
  const hasWakePhrase = messages.some(
    (msg) =>
      msg.toLowerCase().includes("hey beca") ||
      msg.toLowerCase().includes("listen up"),
  );

  if (hasWakePhrase) {
    analysis.push(`- Wake phrase detected in conversation`);
  }

  return analysis.join("\n");
}

/**
 * Extract topics from conversation messages
 */
function extractTopics(messages: string[]): string[] {
  const topics = new Set<string>();

  const topicKeywords = {
    wallet: ["wallet", "balance", "account", "address"],
    transaction: ["send", "receive", "transfer", "transaction"],
    security: ["security", "password", "private key", "seed"],
    network: ["ethereum", "mainnet", "testnet", "gas"],
    registration: ["register", "voice", "enroll", "setup"],
    voice: ["voice", "speak", "listen", "recording", "microphone"],
  };

  const messageText = messages.join(" ").toLowerCase();

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some((keyword) => messageText.includes(keyword))) {
      topics.add(topic);
    }
  }

  return Array.from(topics);
}
