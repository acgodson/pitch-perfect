import type { IAgentRuntime, Memory, Provider } from "@elizaos/core";
import { addHeader, logger } from "@elizaos/core";
import {
  checkVoiceApiHealth,
  getVoiceRegistryProfiles,
  syncVoiceRegistry,
  type VoiceProfile,
} from "@/lib/voice-api-client";
import { voiceSyncManager } from "@/lib/voice-sync-manager";

/**
 * Voice Embedding Provider for ElizaOS
 * Handles voice embedding extraction and voice registry operations
 */

interface VoiceEmbeddingConfig {
  apiUrl: string;
  timeout: number;
}

interface EmbeddingResponse {
  success: boolean;
  embedding: number[];
  embedding_dimension: number;
  model: string;
  error?: string;
}

/**
 * Voice Embedding Provider that integrates with the stateless voice embedding API
 * Provides voice-related context and capabilities to the agent
 */
export const voiceEmbeddingProvider: Provider = {
  name: "VOICE_EMBEDDING",
  description:
    "Voice embedding extraction and voice registry management for biometric authentication and identification",

  get: async (runtime: IAgentRuntime, message: Memory) => {
    logger.debug("*** RETRIEVING VOICE CONTEXT ***");

    try {
      const config = getVoiceConfig(runtime);

      // SYNC PATTERN: Sync localStorage to server first (like starter kit)
      // This ensures ElizaOS has access to the latest voice registry data
      await voiceSyncManager.syncToServer();

      // Get voice registry from server (now synced from localStorage)
      const voiceRegistry = await getVoiceRegistryProfiles();

      // Get API health status
      const apiStatus = await checkVoiceApiHealth();

      // Check if this message contains voice data
      const voiceEmbedding = (message.metadata as any)?.voiceEmbedding;
      let voiceIdentificationResult = null;

      if (voiceEmbedding && Array.isArray(voiceEmbedding)) {
        logger.debug("*** PROCESSING VOICE IDENTIFICATION ***");

        // Perform voice identification
        const voiceService = new VoiceEmbeddingService(runtime);
        voiceIdentificationResult =
          await voiceService.identifyVoice(voiceEmbedding);

        logger.debug("*** VOICE IDENTIFICATION RESULT ***", {
          identified: voiceIdentificationResult.identified,
          confidence: voiceIdentificationResult.confidence,
          match: voiceIdentificationResult.match?.userName,
        });
      }

      // Prepare voice context information
      const voiceContext = {
        apiStatus,
        registeredVoices: voiceRegistry.totalProfiles,
        voiceProfiles: voiceRegistry.profiles,
        voiceIdentification: voiceIdentificationResult,
        capabilities: [
          "Voice embedding extraction",
          "Voice registration and enrollment",
          "Voice identification and verification",
          "Voice consistency analysis",
          "Biometric voice authentication",
          "Speech-to-text transcription",
        ],
      };

      const voiceText = formatVoiceContext(voiceContext);

      logger.debug("*** VOICE CONTEXT RETRIEVED ***", {
        registeredVoices: voiceRegistry.totalProfiles,
        apiStatus: apiStatus.status,
        syncStatus: "localStorage → server sync completed",
        hasVoiceData: !!voiceEmbedding,
        identificationResult: voiceIdentificationResult,
      });

      return {
        data: {
          voiceContext,
          voiceRegistry,
          apiStatus,
          voiceIdentification: voiceIdentificationResult,
        },
        values: {
          voiceContext: voiceText,
          registeredVoicesCount: voiceRegistry.totalProfiles,
          apiHealthy: apiStatus.status === "connected",
          voiceIdentified: voiceIdentificationResult?.identified || false,
          voiceConfidence: voiceIdentificationResult?.confidence || 0,
          voiceMatch: voiceIdentificationResult?.match?.userName || null,
        },
        text: voiceText,
      };
    } catch (error) {
      logger.error("Error in voice embedding provider:", error);

      const errorText = addHeader(
        "# Voice System Status",
        "Voice system currently unavailable. Please check API connection.",
      );

      return {
        data: { error: error.message },
        values: {
          voiceContext: errorText,
          registeredVoicesCount: 0,
          apiHealthy: false,
          voiceIdentified: false,
          voiceConfidence: 0,
          voiceMatch: null,
        },
        text: errorText,
      };
    }
  },
};

/**
 * Get voice configuration from runtime settings
 */
function getVoiceConfig(runtime: IAgentRuntime): VoiceEmbeddingConfig {
  return {
    apiUrl: runtime.getSetting("VOICE_API_URL") || "http://localhost:8000",
    timeout: parseInt(runtime.getSetting("VOICE_API_TIMEOUT") || "30000"),
  };
}

/**
 * Format voice context for the agent
 */
function formatVoiceContext(context: any): string {
  const sections = [];

  // API Status
  sections.push(
    addHeader(
      "# Voice System Status",
      `Status: ${context.apiStatus.status}
${context.apiStatus.model ? `Model: ${context.apiStatus.model}` : ""}
${context.apiStatus.device ? `Device: ${context.apiStatus.device}` : ""}
${
  context.apiStatus.embedding_dimension
    ? `Embedding Dimension: ${context.apiStatus.embedding_dimension}`
    : ""
}`,
    ),
  );

  // Voice Registry
  sections.push(
    addHeader(
      "# Voice Registry",
      `Registered Voices: ${context.registeredVoices}
${
  context.voiceProfiles.length > 0
    ? "Profiles:\n" +
      context.voiceProfiles
        .map(
          (profile) =>
            `- ${
              profile.userName
            } (Consistency: ${profile.consistencyScore.toFixed(3)}, Enrolled: ${new Date(
              profile.enrollmentTimestamp,
            ).toISOString()})`,
        )
        .join("\n")
    : "No voices currently registered"
}`,
    ),
  );

  // Voice Identification Result
  if (context.voiceIdentification) {
    const id = context.voiceIdentification;
    sections.push(
      addHeader(
        "# Voice Identification",
        `Status: ${id.identified ? "IDENTIFIED" : "NOT IDENTIFIED"}
${id.match ? `Matched User: ${id.match.userName}` : ""}
${id.confidence ? `Confidence: ${(id.confidence * 100).toFixed(1)}%` : ""}
${
  id.allScores.length > 0
    ? "Top Matches:\n" +
      id.allScores
        .slice(0, 3)
        .map(
          (score) => `- ${score.userName}: ${(score.score * 100).toFixed(1)}%`,
        )
        .join("\n")
    : ""
}`,
      ),
    );
  }

  // Capabilities
  sections.push(
    addHeader(
      "# Voice Capabilities",
      context.capabilities.map((cap) => `- ${cap}`).join("\n"),
    ),
  );

  return sections.join("\n\n");
}

/**
 * Voice Embedding Service - utility functions for actions
 * This service can be used by ElizaOS actions to perform voice operations
 */
export class VoiceEmbeddingService {
  private apiUrl: string;
  private timeout: number;

  constructor(runtime: IAgentRuntime) {
    const config = getVoiceConfig(runtime);
    this.apiUrl = config.apiUrl;
    this.timeout = config.timeout;
  }

  /**
   * Extract voice embedding from audio data
   */
  async extractEmbedding(audioBlob: Blob): Promise<number[]> {
    const formData = new FormData();
    formData.append("audio", audioBlob);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const response = await fetch(`${this.apiUrl}/extract_embedding`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data: EmbeddingResponse = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Unknown error");
    }

    return data.embedding;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Identify speaker from voice registry
   * SYNC PATTERN: Ensures latest localStorage data is synced to server first
   */
  async identifyVoice(
    testEmbedding: number[],
    threshold: number = 0.82,
    browserSessionId?: string,
  ): Promise<{
    identified: boolean;
    match?: VoiceProfile;
    confidence?: number;
    allScores: Array<{ userName: string; score: number }>;
  }> {
    try {
      // SYNC PATTERN: Sync localStorage to server before identification
      await voiceSyncManager.syncToServer();

      // Use the configured API URL for voice registry endpoints
      const registryUrl = this.apiUrl.replace("/voice", "/voice-registry");

      // Use session-based identification if browserSessionId is provided
      const endpoint = browserSessionId ? "identify/session" : "identify";
      const requestBody = browserSessionId 
        ? { testEmbedding, threshold, browserSessionId }
        : { testEmbedding, threshold };

      const response = await fetch(`${registryUrl}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Identification failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Unknown error in identification");
      }

      return data.data;
    } catch (error) {
      logger.error("Voice identification error:", error);
      return {
        identified: false,
        allScores: [],
      };
    }
  }

  /**
   * Search for similar voices
   * SYNC PATTERN: Ensures latest localStorage data is synced to server first
   */
  async searchVoices(
    embedding: number[],
    topK: number = 5,
  ): Promise<Array<{ userName: string; score: number }>> {
    try {
      // SYNC PATTERN: Sync localStorage to server before search
      await voiceSyncManager.syncToServer();

      // Use the configured API URL for voice registry endpoints
      const registryUrl = this.apiUrl.replace("/voice", "/voice-registry");

      const response = await fetch(`${registryUrl}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ embedding, topK }),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Unknown error in search");
      }

      return data.data.map((result: any) => ({
        userName: result.userName,
        score: result.score,
      }));
    } catch (error) {
      logger.error("Voice search error:", error);
      return [];
    }
  }
}
