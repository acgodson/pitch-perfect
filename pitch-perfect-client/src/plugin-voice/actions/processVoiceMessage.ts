import {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  Content,
} from "@elizaos/core";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const VOICE_API_URL = process.env.VOICE_API_URL || "http://localhost:8000";

export const processVoiceMessage: Action = {
  name: "PROCESS_VOICE_MESSAGE",
  description:
    "Process voice messages for Pitch Perfect - identify speaker first, then transcribe and respond with conversation context",

  similes: [
    "VOICE_PROCESSING",
    "AUDIO_PROCESSING",
    "SPEAKER_IDENTIFICATION",
    "CONVERSATION_CONTEXT",
  ],

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Hey Beca, listen up" },
      },
      {
        name: "Beca",
        content: {
          text: "Hello [User Name]! I've identified you. What can I help you with today?",
          thought:
            "The user said the wake phrase. I've identified them by voice and am ready to process their command.",
          actions: ["PROCESS_VOICE_MESSAGE"],
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "Check my wallet balance" },
      },
      {
        name: "Beca",
        content: {
          text: "I've identified you as [User Name]. I'll check your wallet balance for you.",
          thought:
            "User is asking for wallet balance. I've identified them and will process the request.",
          actions: ["PROCESS_VOICE_MESSAGE"],
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "What about my other wallet?" },
      },
      {
        name: "Beca",
        content: {
          text: "I understand you're asking about your other wallet. Based on our previous conversation about wallet balances, I'll check your other wallet for you.",
          thought:
            "User is asking about their other wallet, referencing our previous conversation about wallet balances. I'll provide context-aware response.",
          actions: ["PROCESS_VOICE_MESSAGE"],
        },
      },
    ],
  ],

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ): Promise<boolean> => {
    // Check if message contains voice data
    const hasVoiceData =
      (message.metadata as any)?.voiceEmbedding ||
      (message as any).attachments?.some((att: any) =>
        att.type?.startsWith("audio/"),
      );

    return !!hasVoiceData;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback,
  ): Promise<unknown> => {
    try {
      console.log(
        "[Pitch Perfect] Processing voice message with conversation context",
      );

      let transcript = "";
      let embedding: number[] | null = null;
      let identificationResult = null;
      let conversationContext = "";

      // Check if we already have embedding from metadata
      if ((message.metadata as any)?.voiceEmbedding) {
        embedding = (message.metadata as any).voiceEmbedding as number[];
        console.log("[Pitch Perfect] Using existing embedding from metadata");
      }

      // Check if we have audio attachment to process
      const audioAttachment = (message as any).attachments?.find((att: any) =>
        att.type?.startsWith("audio/"),
      );

      if (audioAttachment && audioAttachment.data) {
        console.log("[Pitch Perfect] Processing audio attachment");

        // Truncate audio data for logging to prevent long logs
        const audioDataPreview =
          typeof audioAttachment.data === "string"
            ? `${audioAttachment.data.substring(0, 50)}... (${audioAttachment.data.length} chars total)`
            : `${audioAttachment.data.size} bytes`;

        console.log(`[Pitch Perfect] Audio data: ${audioDataPreview}`);

        // Convert base64 to Blob for API call
        const audioBlob = new Blob(
          [Buffer.from(audioAttachment.data, "base64")],
          { type: "audio/wav" },
        );
        console.log(
          `[Voice Action] Converted base64 to Blob: ${audioBlob.size} bytes`,
        );

        // Extract embedding from audio
        if (!embedding) {
          embedding = await extractVoiceEmbedding(audioBlob);
        }

        // Transcribe audio
        transcript = await transcribeAudio(audioBlob);
      }

      // CRITICAL: Always perform voice identification first
      if (embedding) {
        identificationResult = await performVoiceIdentification(
          embedding,
          runtime,
        );
      }

      // Get conversation context if speaker is identified
      if (identificationResult?.identified) {
        conversationContext = await getConversationContext(
          runtime,
          message,
          identificationResult.match?.userId,
        );
      }

      // Get retry count from state or metadata
      const retryCount =
        (state?.retryCount as number) ||
        (message.metadata as any)?.retryCount ||
        0;

      // Prepare response based on identification result and context
      let responseText = "";
      let responseThought = "";

      if (identificationResult?.identified) {
        const userName = identificationResult.match?.userName || "User";

        // Check if this is a wake phrase
        const isWakePhrase =
          transcript.toLowerCase().includes("hey beca") ||
          transcript.toLowerCase().includes("listen up");

        if (isWakePhrase) {
          responseText = `Hello ${userName}! I've identified you. What can I help you with today?`;
          responseThought = `The user said the wake phrase. I've identified them as ${userName} and am ready to process their command.`;
        } else {
          // Enhanced response with conversation context
          const contextInfo = conversationContext
            ? ` Based on our conversation, ${conversationContext}`
            : "";
          responseText = `I've identified you as ${userName}. ${transcript ? `You said: "${transcript}".` : ""}${contextInfo} I'll process your request.`;
          responseThought = `User ${userName} is making a request: "${transcript}". ${conversationContext ? "Using conversation context for enhanced response." : "No previous context available."}`;
        }
      } else {
        // Speaker not identified - handle retry logic
        if (retryCount < 2) {
          responseText = "Please repeat yourself.";
          responseThought = `Voice identification failed (attempt ${retryCount + 1}/2). Asking user to repeat.`;
        } else {
          responseText =
            "I don't recognize your voice. Please register your voice on the startup screen first.";
          responseThought =
            "Voice identification failed after 2 attempts. Directing user to startup screen for registration.";
        }
      }

      const responseContent: Content = {
        thought: responseThought,
        text: responseText,
        actions: ["PROCESS_VOICE_MESSAGE"],
        metadata: {
          retryCount: retryCount + 1,
          voiceIdentified: identificationResult?.identified || false,
          voiceConfidence: identificationResult?.confidence,
          voiceMatch: identificationResult?.match?.userName,
          transcript: transcript,
          speakerId: identificationResult?.match?.userId,
          conversationContext: conversationContext || null,
          hasContext: !!conversationContext,
        },
      };

      if (callback) {
        await callback(responseContent);
      }

      return {
        success: true,
        transcript,
        embedding: embedding?.length,
        identification: identificationResult,
        speakerIdentified: identificationResult?.identified || false,
        retryCount: retryCount + 1,
        conversationContext: conversationContext || null,
        hasContext: !!conversationContext,
      };
    } catch (error) {
      console.error("[Pitch Perfect] Error processing voice message:", error);

      const errorContent: Content = {
        thought: "I encountered an error while processing the voice message.",
        text: "Sorry, I had trouble processing your voice message. Please try again.",
        actions: ["PROCESS_VOICE_MESSAGE"],
      };

      if (callback) {
        await callback(errorContent);
      }

      return { success: false, error: error.message };
    }
  },
};

// Helper functions
async function extractVoiceEmbedding(audioData: any): Promise<number[]> {
  // Convert base64 string to Blob if needed
  let audioBlob: Blob;
  if (typeof audioData === "string") {
    // Convert base64 to Blob
    const byteCharacters = atob(audioData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let j = 0; j < byteCharacters.length; j++) {
      byteNumbers[j] = byteCharacters.charCodeAt(j);
    }
    const byteArray = new Uint8Array(byteNumbers);
    audioBlob = new Blob([byteArray], { type: "audio/wav" });
    console.log(
      `[Voice Action] Converted base64 to Blob: ${audioBlob.size} bytes`,
    );
  } else {
    audioBlob = audioData;
  }

  const formData = new FormData();
  formData.append("audio", audioBlob, "audio.wav");

  const response = await fetch(`${VOICE_API_URL}/extract_embedding`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Embedding extraction failed: ${response.status}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "Unknown error in embedding extraction");
  }

  return data.embedding;
}

async function transcribeAudio(audioData: any): Promise<string> {
  try {
    // Create a File object for OpenAI
    const audioFile = new File([audioData], "audio.webm", {
      type: "audio/webm",
    });

    const transcription = await openai.audio.transcriptions.create({
      model: "gpt-4o-transcribe",
      file: audioFile,
      language: "en",
    });

    return transcription.text;
  } catch (error) {
    console.error("[Voice Action] Transcription error:", error);
    return "Voice recording for identification";
  }
}

async function performVoiceIdentification(
  embedding: number[],
  runtime: IAgentRuntime,
): Promise<any> {
  try {
    // Get voice registry from provider
    const voiceProvider = runtime.providers.find(
      (p) => p.name === "voiceEmbedding",
    );
    if (!voiceProvider) {
      return { identified: false, allScores: [] };
    }

    const voiceContext = await voiceProvider.get(
      runtime,
      {} as Memory,
      {} as State,
    );

    if (!voiceContext.data?.voiceRegistry?.profiles) {
      return { identified: false, allScores: [] };
    }

    // Perform identification using cosine similarity
    const profiles = voiceContext.data.voiceRegistry.profiles;
    let bestMatch = null;
    let bestScore = 0;
    const threshold = 0.82;

    for (const profile of profiles) {
      const score = cosineSimilarity(embedding, profile.voiceEmbedding);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = profile;
      }
    }

    return {
      identified: bestScore >= threshold,
      match: bestMatch,
      confidence: bestScore,
      allScores: profiles
        .map((p) => ({
          userName: p.userName,
          score: cosineSimilarity(embedding, p.voiceEmbedding),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5),
    };
  } catch (error) {
    console.error("[Voice Action] Identification error:", error);
    return { identified: false, allScores: [] };
  }
}

async function getConversationContext(
  runtime: IAgentRuntime,
  currentMessage: Memory,
  speakerId?: string,
): Promise<string> {
  try {
    console.log(
      "[Pitch Perfect] Retrieving conversation context for speaker:",
      speakerId,
    );

    // Use the conversation context provider
    const conversationProvider = runtime.providers.find(
      (p) => p.name === "CONVERSATION_CONTEXT",
    );
    if (!conversationProvider) {
      console.log("[Pitch Perfect] Conversation context provider not found");
      return "";
    }

    const contextResult = await conversationProvider.get(
      runtime,
      currentMessage,
      {} as State,
    );

    if (contextResult.values?.conversationContext) {
      console.log(
        "[Pitch Perfect] Conversation context retrieved successfully",
      );
      return contextResult.values.conversationContext;
    }

    return "";
  } catch (error) {
    console.error("[Pitch Perfect] Error getting conversation context:", error);
    return "";
  }
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
