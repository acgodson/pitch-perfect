"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { VoiceMessageHandler } from "@/components/VoiceMessageHandler";
import { voiceSessionManager } from "@/lib/voice-session-manager";

export default function VoiceSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Initialize session on page load/refresh
  useEffect(() => {
    const initializeSession = async () => {
      if (!sessionId) {
        setError("No session ID provided");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // For now, just use the session ID directly
        // In a real app, you might validate the session exists
        setActiveSessionId(sessionId);
        console.log(`[VoiceSessionPage] Using session: ${sessionId}`);
      } catch (error) {
        console.error(
          "[VoiceSessionPage] Failed to initialize session:",
          error,
        );
        setError("Failed to initialize session");
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();
  }, [sessionId]);

  const handleSessionCreated = (newSessionId: string) => {
    console.log("[VoiceSessionPage] New session created:", newSessionId);
    setActiveSessionId(newSessionId);
  };

  const handleSessionLoaded = (loadedSessionId: string) => {
    console.log("[VoiceSessionPage] Session loaded:", loadedSessionId);
    setActiveSessionId(loadedSessionId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading voice session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-6 max-w-md">
            <h2 className="text-red-400 text-xl font-semibold mb-2">Error</h2>
            <p className="text-red-300 mb-4">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!activeSessionId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-lg">No session data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Voice Session
            </h1>
            <div className="text-blue-200 text-sm">
              Session ID: {activeSessionId}
            </div>
          </div>
          <button
            onClick={() => router.push("/")}
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Home
          </button>
        </div>

        {/* Session Info */}
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 mb-8 border border-white/10">
          <h2 className="text-xl font-semibold text-white mb-4">
            Session Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-300">Session ID:</span>
              <span className="text-white ml-2 font-mono">
                {activeSessionId}
              </span>
            </div>
            <div>
              <span className="text-blue-300">Status:</span>
              <span className="text-green-400 ml-2">Active</span>
            </div>
            <div>
              <span className="text-blue-300">Type:</span>
              <span className="text-white ml-2">Voice Session</span>
            </div>
            <div>
              <span className="text-blue-300">Agent:</span>
              <span className="text-white ml-2">Beca</span>
            </div>
          </div>
        </div>

        {/* Voice Interface */}
        <div className="flex justify-center">
          <VoiceMessageHandler
            sessionId={activeSessionId}
            onSessionCreated={handleSessionCreated}
            onSessionLoaded={handleSessionLoaded}
            className="w-full max-w-md"
          />
        </div>

        {/* Session Status */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center bg-green-500/20 border border-green-500/30 rounded-full px-4 py-2">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
            <span className="text-green-300 text-sm">Voice session active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
