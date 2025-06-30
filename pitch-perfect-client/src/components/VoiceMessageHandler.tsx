"use client";

import { useCallback, useEffect, useState } from "react";
import { VoiceRecorder } from "./VoiceRecorder";
import { voiceSessionManager } from "@/lib/voice-session-manager";

interface VoiceMessageHandlerProps {
  sessionId?: string;
  disabled?: boolean;
  className?: string;
  onSessionCreated?: (sessionId: string) => void;
  onSessionLoaded?: (sessionId: string) => void;
}

export function VoiceMessageHandler({
  sessionId,
  disabled = false,
  className = "",
  onSessionCreated,
  onSessionLoaded,
}: VoiceMessageHandlerProps) {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize session on component mount
  useEffect(() => {
    const initializeSession = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let activeSessionId: string;

        if (sessionId) {
          // Use existing session ID
          activeSessionId = sessionId;
          onSessionLoaded?.(activeSessionId);
          console.log(
            "[VoiceMessageHandler] Using existing session:",
            activeSessionId,
          );
        } else {
          // Create new session
          activeSessionId = await voiceSessionManager.createSession();
          onSessionCreated?.(activeSessionId);
          console.log(
            "[VoiceMessageHandler] Created new session:",
            activeSessionId,
          );
        }

        setCurrentSessionId(activeSessionId);

        // Set up message listeners
        const socketManager = voiceSessionManager.getSocketManager();

        socketManager.on("messageBroadcast", (data) => {
          console.log("[VoiceMessageHandler] Received message:", data);
          // Handle incoming messages here
        });

        socketManager.on("messageComplete", (data) => {
          console.log("[VoiceMessageHandler] Message complete:", data);
          // Handle message completion here
        });
      } catch (error) {
        console.error(
          "[VoiceMessageHandler] Error initializing session:",
          error,
        );
        setError(
          error instanceof Error
            ? error.message
            : "Failed to initialize session",
        );
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();
  }, [sessionId, onSessionCreated, onSessionLoaded]);

  const handleVoiceRecording = useCallback(
    async (audioBlob: Blob) => {
      if (!currentSessionId) {
        console.error(
          "[VoiceMessageHandler] No active session for voice recording",
        );
        return;
      }

      try {
        console.log("[VoiceMessageHandler] Sending voice recording to ElizaOS");

        // Convert blob to base64
        const arrayBuffer = await audioBlob.arrayBuffer();
        const base64Audio = btoa(
          String.fromCharCode(...new Uint8Array(arrayBuffer)),
        );

        // Send voice message using the new session manager
        await voiceSessionManager.sendVoiceMessage(base64Audio, "command");

        console.log(
          "[VoiceMessageHandler] Voice message sent to ElizaOS for processing",
        );
      } catch (error) {
        console.error(
          "[VoiceMessageHandler] Error sending voice recording:",
          error,
        );
      }
    },
    [currentSessionId],
  );

  const handleVoiceError = useCallback((error: string) => {
    console.error("[VoiceMessageHandler] Voice recording error:", error);
  }, []);

  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-sm text-gray-600">
            Initializing voice session...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center p-4">
          <span className="text-sm text-red-600">Error: {error}</span>
        </div>
      </div>
    );
  }

  if (!currentSessionId) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center p-4">
          <span className="text-sm text-red-600">
            Failed to initialize voice session
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <VoiceRecorder
        onRecordingComplete={handleVoiceRecording}
        onError={handleVoiceError}
        disabled={disabled}
      />
    </div>
  );
}
