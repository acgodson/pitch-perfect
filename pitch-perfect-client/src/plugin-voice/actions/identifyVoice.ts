import {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  Content,
} from "@elizaos/core";

export const identifyVoice: Action = {
  name: "IDENTIFY_VOICE",
  description: "Identify speaker for Pitch Perfect voice authentication",

  similes: ["VOICE_IDENTIFICATION", "SPEAKER_ID", "VOICE_AUTH"],

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ): Promise<boolean> => {
    // Check if message contains voice identification request
    const text = message.content.text?.toLowerCase() || "";
    const metadata = message.metadata as any;
    
    // Debug: Log the actual metadata structure
    console.log("[Voice Identification] Validation metadata:", {
      metadataKeys: Object.keys(metadata || {}),
      rawKeys: Object.keys(metadata?.raw || {}),
      rawMetadataKeys: Object.keys(metadata?.raw?.metadata || {}),
      hasAudioDataDirect: !!metadata?.audioData,
      hasAudioDataRaw: !!metadata?.raw?.audioData,
      hasAudioDataRawMetadata: !!metadata?.raw?.metadata?.audioData,
      source: metadata?.source,
      rawSource: metadata?.raw?.source,
      rawMetadataSource: metadata?.raw?.metadata?.source,
    });
    
    // Check for explicit identification commands
    const hasIdentificationCommand = 
      text.includes("who am i") ||
      text.includes("identify me") ||
      text.includes("voice id") ||
      text.includes("who is speaking");
    
    // Check for voice messages with audio data (likely identification attempts)
    // Check all possible paths for audio data
    const hasAudioData = !!(
      metadata?.audioData || 
      metadata?.raw?.audioData || 
      metadata?.raw?.metadata?.audioData
    );
    const isVoiceMessage = 
      metadata?.source === "voice_recording" || 
      metadata?.raw?.source === "voice_recording" ||
      metadata?.raw?.metadata?.source === "voice_recording";
    
    // Check for startup phrases in the message
    const hasStartupPhrase = 
      text.includes("beca") ||
      text.includes("listen up") ||
      text.includes("listening up");
    
    console.log("[Voice Identification] Validation check:", {
      text,
      hasIdentificationCommand,
      hasAudioData,
      isVoiceMessage,
      hasStartupPhrase,
      shouldValidate: hasIdentificationCommand || (hasAudioData && (isVoiceMessage || hasStartupPhrase))
    });
    
    return hasIdentificationCommand || (hasAudioData && (isVoiceMessage || hasStartupPhrase));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback,
  ): Promise<unknown> => {
    try {
      // Extract browser session ID and audio data from message metadata
      const metadata = message.metadata as any;
      const browserSessionId = metadata?.browserSessionId || metadata?.raw?.browserSessionId || metadata?.raw?.metadata?.browserSessionId;
      const audioData = metadata?.audioData || metadata?.raw?.audioData || metadata?.raw?.metadata?.audioData;

      console.log("[Voice Identification] Processing voice identification request", {
        browserSessionId: browserSessionId || "not provided",
        hasAudioData: !!audioData,
        messageText: message.content.text,
        audioDataPath: audioData ? "found" : "not found",
      });

      if (!audioData) {
        const responseContent: Content = {
          thought: "No audio data provided for voice identification",
          text: "I need a voice sample to identify you. Please record your voice and try again.",
          actions: ["IDENTIFY_VOICE"],
          metadata: {
            identificationRequested: true,
            error: "No audio data",
          },
        };

        if (callback) {
          await callback(responseContent);
        }

        return { success: false, error: "No audio data provided" };
      }

      // Extract voice embedding from audio data
      try {
        console.log("[Voice Identification] Extracting voice embedding...");
        
        // Convert base64 to Blob
        const audioBlob = new Blob([Buffer.from(audioData, "base64")], {
          type: "audio/wav",
        });

        // Use the VoiceEmbeddingService to extract embedding
        const voiceService = new (await import("../providers/embedding")).VoiceEmbeddingService(runtime);
        const voiceEmbedding = await voiceService.extractEmbedding(audioBlob);

        if (!voiceEmbedding || !Array.isArray(voiceEmbedding)) {
          throw new Error("Failed to extract voice embedding");
        }

        console.log("[Voice Identification] Voice embedding extracted successfully");

        // Perform voice identification using session-based search
        const identificationResult = await voiceService.identifyVoice(
          voiceEmbedding,
          0.82, // threshold
          browserSessionId
        );

        console.log("[Voice Identification] Identification result:", {
          identified: identificationResult.identified,
          match: identificationResult.match?.userName,
          confidence: identificationResult.confidence,
          profilesSearched: identificationResult.allScores.length,
        });

        if (identificationResult.identified && identificationResult.match) {
          const responseContent: Content = {
            thought: `Successfully identified user as ${identificationResult.match.userName} with confidence ${(identificationResult.confidence! * 100).toFixed(1)}%`,
            text: `🎉 Welcome back, ${identificationResult.match.userName}!\n\nVoice identification successful with ${(identificationResult.confidence! * 100).toFixed(1)}% confidence.\n\nYour profile is now unlocked and ready for voice commands.`,
            actions: ["IDENTIFY_VOICE"],
            metadata: {
              identificationSuccess: true,
              identifiedUser: identificationResult.match.userName,
              userId: identificationResult.match.userId,
              confidence: identificationResult.confidence,
              browserSessionId: browserSessionId,
            },
          };

          if (callback) {
            await callback(responseContent);
          }

          return { 
            success: true, 
            identified: true,
            user: identificationResult.match,
            confidence: identificationResult.confidence,
            browserSessionId: browserSessionId,
          };
        } else {
          const responseContent: Content = {
            thought: "Voice identification failed - no matching profile found",
            text: `❌ Voice identification failed.\n\nI couldn't find a matching voice profile. Please make sure you have registered your voice first, or try speaking more clearly.\n\nConfidence scores: ${identificationResult.allScores.map(s => `${s.userName}: ${(s.score * 100).toFixed(1)}%`).join(', ')}`,
            actions: ["IDENTIFY_VOICE"],
            metadata: {
              identificationSuccess: false,
              allScores: identificationResult.allScores,
              browserSessionId: browserSessionId,
            },
          };

          if (callback) {
            await callback(responseContent);
          }

          return { 
            success: false, 
            identified: false,
            allScores: identificationResult.allScores,
            browserSessionId: browserSessionId,
          };
        }

      } catch (embeddingError) {
        console.error("[Voice Identification] Error extracting embedding:", embeddingError);
        
        const errorContent: Content = {
          thought: "Error extracting voice embedding for identification",
          text: "❌ Voice identification failed.\n\nI had trouble processing your voice sample. Please try again or ensure your microphone is working properly.",
          actions: ["IDENTIFY_VOICE"],
          metadata: {
            identificationSuccess: false,
            error: embeddingError.message,
            browserSessionId: browserSessionId,
          },
        };

        if (callback) {
          await callback(errorContent);
        }

        return { success: false, error: embeddingError.message };
      }

    } catch (error) {
      console.error("[Voice Identification] Error:", error);
      
      const errorContent: Content = {
        thought: "Error processing voice identification request",
        text: "Sorry, I had trouble processing your voice identification request. Please try again.",
        actions: ["IDENTIFY_VOICE"],
      };

      if (callback) {
        await callback(errorContent);
      }

      return { success: false, error: error.message };
    }
  },
};
