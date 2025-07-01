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
    
    // NEW: Check if this is a voice transcription (from unlocked session)
    const isVoiceTranscription = 
      metadata?.source === "voice_transcription" ||
      metadata?.raw?.source === "voice_transcription" ||
      metadata?.raw?.metadata?.source === "voice_transcription";
    
    // Check for startup phrases in the message
    const hasStartupPhrase = 
      text.includes("beca") ||
      text.includes("listen up") ||
      text.includes("listening up");
    
    // IMPORTANT: Skip identification for voice transcriptions (unlocked sessions)
    if (isVoiceTranscription) {
      console.log("[Voice Identification] Skipping validation - this is a voice transcription for conversation, not identification");
      return false;
    }
    
    // Import voice session state manager to check if session is already unlocked
    let isSessionUnlocked = false;
    try {
      const { voiceSessionState } = await import("../../lib/voice-session-state");
      isSessionUnlocked = voiceSessionState.isSessionUnlocked();
    } catch (error) {
      console.log("[Voice Identification] Could not check session state:", error);
    }
    
    // If session is unlocked and this is a voice message (not explicit identification command),
    // skip identification - it should be handled as conversation
    if (isSessionUnlocked && !hasIdentificationCommand && isVoiceMessage) {
      console.log("[Voice Identification] Skipping validation - session is unlocked and this appears to be a conversation voice message");
      return false;
    }
    
    console.log("[Voice Identification] Validation check:", {
      text,
      hasIdentificationCommand,
      hasAudioData,
      isVoiceMessage,
      isVoiceTranscription,
      hasStartupPhrase,
      isSessionUnlocked,
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

      // Check if this is a transaction confirmation request (always allow identification for security)
      const messageText = message.content.text?.toLowerCase() || "";
      const isTransactionConfirmation = 
        messageText.includes("confirm") ||
        messageText.includes("transaction") ||
        messageText.includes("transfer") ||
        messageText.includes("send") ||
        messageText.includes("approve");

      // Import voice session state manager
      const { voiceSessionState } = await import("../../lib/voice-session-state");
      
      // Check if session is already unlocked (skip redundant identification unless it's a transaction)
      if (!isTransactionConfirmation && voiceSessionState.isSessionUnlocked()) {
        const identifiedUser = voiceSessionState.getIdentifiedUser();
        if (identifiedUser) {
          console.log("[Voice Identification] Session already unlocked, skipping identification for:", identifiedUser.userName);
          
          const responseContent: Content = {
            thought: `Session already unlocked for ${identifiedUser.userName}`,
            text: `✅ You're already identified as ${identifiedUser.userName}.\n\nSession is active and ready for voice commands. {"identificationSuccess":true,"identifiedUser":"${identifiedUser.userName}","userId":"${identifiedUser.userId}","confidence":${identifiedUser.confidence},"browserSessionId":"${browserSessionId || 'none'}","sessionAlreadyActive":true}`,
            actions: ["IDENTIFY_VOICE"],
            metadata: {
              identificationSuccess: true,
              identifiedUser: identifiedUser.userName,
              userId: identifiedUser.userId,
              confidence: identifiedUser.confidence,
              browserSessionId: browserSessionId,
              sessionAlreadyActive: true,
            },
          };

          if (callback) {
            await callback(responseContent);
          }

          return { 
            success: true, 
            identified: true,
            user: identifiedUser,
            confidence: identifiedUser.confidence,
            browserSessionId: browserSessionId,
            sessionAlreadyActive: true,
          };
        }
      }

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
          // Save the session state for future use
          const { voiceSessionState } = await import("../../lib/voice-session-state");
          voiceSessionState.updateWithIdentification({
            identifiedUser: identificationResult.match.userName,
            identifiedUserId: identificationResult.match.userId,
            confidence: identificationResult.confidence!,
            browserSessionId: browserSessionId,
          });

          const responseContent: Content = {
            thought: `Successfully identified user as ${identificationResult.match.userName} with confidence ${(identificationResult.confidence! * 100).toFixed(1)}%`,
            text: `🎉 Welcome back, ${identificationResult.match.userName}!\n\nVoice identification successful with ${(identificationResult.confidence! * 100).toFixed(1)}% confidence.\n\nYour profile is now unlocked and ready for voice commands. {"identificationSuccess":true,"identifiedUser":"${identificationResult.match.userName}","userId":"${identificationResult.match.userId}","confidence":${identificationResult.confidence},"browserSessionId":"${browserSessionId || 'none'}"}`,
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
