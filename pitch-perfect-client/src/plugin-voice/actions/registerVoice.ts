import {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  Content,
} from "@elizaos/core";

export const registerVoice: Action = {
  name: "REGISTER_VOICE",
  description:
    "Register a new voice profile for Pitch Perfect using array of audio samples from frontend",

  similes: ["VOICE_ENROLLMENT", "VOICE_REGISTRATION", "VOICE_PROFILE"],

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ): Promise<boolean> => {
    // Check for registration data in multiple possible locations
    const metadata = message.metadata as any;
    const hasRegistrationData =
      metadata?.registrationData ||
      metadata?.raw?.registrationData ||
      metadata?.raw?.metadata?.registrationData;

    // Truncate audio data for cleaner logging
    const registrationData =
      metadata?.registrationData ||
      metadata?.raw?.registrationData ||
      metadata?.raw?.metadata?.registrationData;
    const truncatedRegistrationData = registrationData
      ? {
          userName: registrationData.userName,
          audioFilesCount: Array.isArray(registrationData.audioFiles)
            ? registrationData.audioFiles.length
            : 0,
          phraseIndices: registrationData.phraseIndices,
          profileData: registrationData.profileData,
        }
      : null;

    console.log("[Pitch Perfect] Voice registration validation:", {
      hasRegistrationData: !!hasRegistrationData,
      messageText: message.content.text,
      registrationData: truncatedRegistrationData,
      metadataKeys: Object.keys(metadata || {}),
      rawKeys: metadata?.raw ? Object.keys(metadata.raw) : [],
    });

    return !!hasRegistrationData;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback,
  ): Promise<unknown> => {
    try {
      console.log("[Pitch Perfect] Voice registration handler called!");
      console.log(
        "[Pitch Perfect] Processing voice registration from frontend",
      );

      // Get registration data from multiple possible locations
      const metadata = message.metadata as any;
      const registrationData =
        metadata?.registrationData ||
        metadata?.raw?.registrationData ||
        metadata?.raw?.metadata?.registrationData;

      if (!registrationData) {
        throw new Error("No registration data provided");
      }

      console.log(`[Pitch Perfect] Registration data received:`, {
        userName: registrationData.userName,
        audioFilesCount: Array.isArray(registrationData.audioFiles)
          ? registrationData.audioFiles.length
          : 0,
        phraseIndices: registrationData.phraseIndices,
      });

      // Process registration with audio files
      return await processVoiceRegistration(
        registrationData,
        runtime,
        callback,
      );
    } catch (error) {
      console.error("[Pitch Perfect] Voice registration error:", error);

      const errorContent: Content = {
        thought: "I encountered an error during voice registration.",
        text: "Sorry, I had trouble processing your voice registration. Please try again.",
        actions: ["REGISTER_VOICE"],
      };

      if (callback) {
        await callback(errorContent);
      }

      return { success: false, error: error.message };
    }
  },
};

async function processVoiceRegistration(
  registrationData: any,
  runtime: IAgentRuntime,
  callback?: HandlerCallback,
): Promise<any> {
  try {
    const { userName, audioFiles, phraseIndices } = registrationData;

    if (
      !userName ||
      !audioFiles ||
      !Array.isArray(audioFiles) ||
      audioFiles.length === 0
    ) {
      throw new Error(
        "Invalid registration data: missing userName or audioFiles",
      );
    }

    console.log(
      `[Pitch Perfect] Processing registration for ${userName} with ${audioFiles.length} audio files`,
    );

    // Extract embeddings from all audio files
    const embeddings: number[][] = [];
    const VOICE_API_URL = process.env.VOICE_API_URL || "http://localhost:8000";

    // Process each audio file
    for (let i = 0; i < audioFiles.length; i++) {
      const audioData = audioFiles[i];
      const phraseIndex = phraseIndices[i];

      // Truncate audio data for logging to prevent long logs
      const audioDataPreview =
        typeof audioData === "string"
          ? `${audioData.substring(0, 50)}... (${audioData.length} chars total)`
          : `${audioData.size} bytes`;

      console.log(
        `[Pitch Perfect] Extracting embedding from audio file ${i + 1}/${audioFiles.length} (${audioDataPreview})`,
      );

      try {
        // Convert base64 to Blob for API call
        const audioBlob = new Blob([Buffer.from(audioData, "base64")], {
          type: "audio/wav",
        });
        console.log(
          `[Pitch Perfect] Converted base64 to Blob: ${audioBlob.size} bytes`,
        );

        const formData = new FormData();
        formData.append("audio", audioBlob, `phrase_${i + 1}.wav`);

        const response = await fetch(`${VOICE_API_URL}/extract_embedding`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Voice API error: ${response.status} ${response.statusText} - ${errorText}`,
          );
        }

        const data = await response.json();
        if (!data.embedding || !Array.isArray(data.embedding)) {
          throw new Error("Invalid embedding response from voice API");
        }

        embeddings.push(data.embedding);
        console.log(
          `[Pitch Perfect] Successfully extracted embedding for file ${i + 1}`,
        );
      } catch (fetchError) {
        console.error(
          `[Pitch Perfect] Failed to extract embedding for file ${i + 1}:`,
          fetchError,
        );

        // Send error response to frontend
        const errorContent: Content = {
          thought: `Failed to extract voice embedding for phrase ${i + 1}. The voice API service may not be running.`,
          text: `❌ Voice registration failed!\n\nError: ${fetchError.message}\n\nPlease ensure the voice API service is running and try again.`,
          actions: ["REGISTER_VOICE"],
          metadata: {
            registrationSuccess: false,
            error: fetchError.message,
            failedAt: `phrase_${i + 1}`,
            userName: userName,
          },
        };

        if (callback) {
          await callback(errorContent);
        }

        return { success: false, error: fetchError.message };
      }
    }

    // Calculate consistency score
    const consistencyScore = calculateConsistencyScore(embeddings);

    // Create voice profile
    const voiceProfile = {
      userId: generateUserId(),
      userName: userName,
      voiceEmbedding: calculateCentroidEmbedding(embeddings),
      phraseEmbeddings: embeddings,
      phrases: phraseIndices.map((idx: number) => getPhraseByIndex(idx)),
      consistencyScore: consistencyScore,
      minConsistency: 0.7,
      enrollmentTimestamp: Date.now(),
      browserSessionId: registrationData.browserSessionId || null,
    };

    // Save to voice registry
    try {
      // Agent runs in ElizaOS but needs to reach Next.js server
      // Use environment variable or default to localhost:4000
      const nextjsUrl = process.env.NEXT_SERVER_URL || "http://localhost:4000";
      console.log(
        `[Pitch Perfect] Attempting to sync voice profile to: ${nextjsUrl}`,
      );

      const syncResponse = await fetch(
        `${nextjsUrl}/api/eliza/voice-registry/sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            profiles: [voiceProfile],
            settings: {
              identificationThreshold: 0.82,
              consistencyThreshold: 0.7,
              requiredPhrases: 2,
              apiUrl: VOICE_API_URL,
            },
          }),
        },
      );

      if (syncResponse.ok) {
        const syncData = await syncResponse.json();
        console.log(
          `[Pitch Perfect] ✅ Voice profile synced to registry: ${syncData.data?.profilesCount || 0} profiles`,
        );
      } else {
        const errorText = await syncResponse.text();
        console.error(
          `[Pitch Perfect] ❌ Failed to sync voice profile to registry: ${syncResponse.status} - ${errorText}`,
        );
        console.error(
          `[Pitch Perfect] Voice profile created but NOT synced. Profile data:`,
          {
            userId: voiceProfile.userId,
            userName: voiceProfile.userName,
            consistencyScore: voiceProfile.consistencyScore,
            phrasesCount: voiceProfile.phrases.length,
          },
        );
      }
    } catch (syncError) {
      console.error(
        `[Pitch Perfect] ❌ Critical error during sync:`,
        syncError,
      );
      console.error(
        `[Pitch Perfect] Voice profile created but NOT synced due to network error. Profile data:`,
        {
          userId: voiceProfile.userId,
          userName: voiceProfile.userName,
          consistencyScore: voiceProfile.consistencyScore,
          phrasesCount: voiceProfile.phrases.length,
        },
      );
    }

    // Save session state since registration automatically unlocks the session
    const { voiceSessionState } = await import("../../lib/voice-session-state");
    voiceSessionState.updateWithIdentification({
      identifiedUser: userName,
      identifiedUserId: voiceProfile.userId,
      confidence: consistencyScore, // Use consistency score as confidence
      browserSessionId: registrationData.browserSessionId,
    });

    const responseContent: Content = {
      thought: `Successfully registered voice for ${userName}. Consistency score: ${consistencyScore.toFixed(3)}. Voice profile created with ${embeddings.length} phrases. Session automatically unlocked.`,
      text: `🎉 Voice registration successful for ${userName}!\n\nConsistency Score: ${(consistencyScore * 100).toFixed(1)}%\nPhrases Recorded: ${embeddings.length}\n\nYour profile is now unlocked and ready for voice commands!\n\nProfile ID: ${voiceProfile.userId} {"registrationSuccess":true,"identificationSuccess":true,"identifiedUser":"${userName}","userId":"${voiceProfile.userId}","confidence":${consistencyScore},"browserSessionId":"${registrationData.browserSessionId || 'none'}","isFromRegistration":true,"autoUnlocked":true}`,
      actions: ["REGISTER_VOICE"],
      metadata: {
        registrationSuccess: true,
        // Add identification metadata for automatic session unlock
        identificationSuccess: true,
        identifiedUser: userName,
        userId: voiceProfile.userId,
        confidence: consistencyScore,
        browserSessionId: registrationData.browserSessionId,
        // Registration-specific metadata
        consistencyScore: consistencyScore,
        phrasesCount: embeddings.length,
        voiceProfile: {
          userId: voiceProfile.userId,
          userName: voiceProfile.userName,
          voiceEmbedding: voiceProfile.voiceEmbedding,
          phraseEmbeddings: voiceProfile.phraseEmbeddings,
          phrases: voiceProfile.phrases,
          consistencyScore: voiceProfile.consistencyScore,
          minConsistency: voiceProfile.minConsistency,
          enrollmentTimestamp: voiceProfile.enrollmentTimestamp,
          browserSessionId: voiceProfile.browserSessionId,
        },
        // Flag to indicate this is from registration (for different UI handling)
        isFromRegistration: true,
      },
    };

    if (callback) {
      await callback(responseContent);
    }

    return {
      success: true,
      voiceProfile: voiceProfile,
      consistencyScore: consistencyScore,
    };
  } catch (error) {
    console.error("[Pitch Perfect] Registration processing error:", error);

    // Send error response to frontend
    const errorContent: Content = {
      thought: `Voice registration failed with error: ${error.message}`,
      text: `❌ Voice registration failed!\n\nError: ${error.message}\n\nPlease try again or contact support if the problem persists.`,
      actions: ["REGISTER_VOICE"],
      metadata: {
        registrationSuccess: false,
        error: error.message,
        userName: registrationData?.userName || "Unknown",
      },
    };

    if (callback) {
      await callback(errorContent);
    }

    return { success: false, error: error.message };
  }
}

function calculateConsistencyScore(embeddings: number[][]): number {
  if (embeddings.length < 2) return 1.0;

  let totalSimilarity = 0;
  let comparisons = 0;

  for (let i = 0; i < embeddings.length; i++) {
    for (let j = i + 1; j < embeddings.length; j++) {
      totalSimilarity += cosineSimilarity(embeddings[i], embeddings[j]);
      comparisons++;
    }
  }

  return comparisons > 0 ? totalSimilarity / comparisons : 1.0;
}

function calculateCentroidEmbedding(embeddings: number[][]): number[] {
  if (embeddings.length === 0) return [];
  if (embeddings.length === 1) return embeddings[0];

  const dimension = embeddings[0].length;
  const centroid = new Array(dimension).fill(0);

  for (const embedding of embeddings) {
    for (let i = 0; i < dimension; i++) {
      centroid[i] += embedding[i];
    }
  }

  // Normalize
  const magnitude = Math.sqrt(
    centroid.reduce((sum, val) => sum + val * val, 0),
  );
  return centroid.map((val) => val / magnitude);
}

function cosineSimilarity(a: number[], b: number[]): number {
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

function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getPhraseByIndex(index: number): string {
  const phrases = [
    "The quick brown fox jumps over the lazy dog",
    "Hello world, this is a test phrase",
  ];
  return phrases[index] || `Phrase ${index}`;
}
