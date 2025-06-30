"use client";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  VoiceMicrophone,
  VoiceProgressIndicator,
} from "@/components/molecules";
import { cn } from "@/lib/utils";

type Stage = "waiting" | "listening" | "processing" | "complete";

interface VoiceCommandCenterProps {
  onCommand?: (audioBlob: Blob) => void;
  className?: string;
  isProcessing?: boolean;
  isProfileMatched?: boolean;
}

export const VoiceCommandCenter = ({
  onCommand,
  className,
  isProcessing = false,
  isProfileMatched = false,
}: VoiceCommandCenterProps) => {
  const [isListening, setIsListening] = useState(false);
  const [stage, setStage] = useState<Stage>("waiting");
  const [currentCommand, setCurrentCommand] = useState("");
  const [hasPermission, setHasPermission] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null,
  );
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  const requestMicrophonePermission = async () => {
    if (!isClient || typeof window === "undefined") {
      return;
    }

    if (!navigator.mediaDevices) {
      console.error("MediaDevices API not supported in this browser");
      setHasPermission(false);
      setShowPermissionModal(true);
      return;
    }

    setIsRequestingPermission(true);
    setShowPermissionModal(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      setHasPermission(true);
      stream.getTracks().forEach((track) => track.stop()); // Stop the stream after getting permission
    } catch (err) {
      console.error("Microphone permission denied:", err);
      setHasPermission(false);
      setShowPermissionModal(true); // Show modal again if permission denied
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const startRecording = async () => {
    if (!isClient || typeof window === "undefined") {
      return;
    }

    if (!navigator.mediaDevices) {
      setShowPermissionModal(true);
      return;
    }

    if (!hasPermission) {
      setShowPermissionModal(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        setAudioChunks(chunks);

        // Send the audio blob to the parent component
        onCommand?.(audioBlob);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsListening(true);
      setStage("listening");

      // Auto-stop recording after 5 seconds
      setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
          setIsListening(false);
          setStage("processing");
        }
      }, 5000);
    } catch (err) {
      console.error("Error starting recording:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      setIsListening(false);
      setStage("processing");
    }
  };

  // Don't render anything until we're on the client side
  if (!isClient) {
    return (
      <div className={cn("relative w-80 h-80 group", className)}>
        <div className="w-full h-full rounded-full overflow-hidden relative transition-all duration-700 bg-white/8 backdrop-blur-2xl border border-white/15 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-white/3 rounded-full" />
          <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-gradient-to-b from-white/10 to-transparent rounded-full blur-sm" />
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6 p-8 z-10">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white/30 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="text-center">
              <p className="text-sm text-white/60 font-light">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main microphone card - always visible */}
      <div className={cn("relative w-80 h-80 group", className)}>
        {/* Liquid glass circular container with premium effects */}
        <div
          className={cn(
            "w-full h-full rounded-full overflow-hidden relative transition-all duration-700",
            "bg-white/8 backdrop-blur-2xl border border-white/15 shadow-2xl",
            "hover:bg-white/12 hover:border-white/25 hover:shadow-3xl",
            // Recording state - subtle red glow and pulsing
            isListening &&
              "animate-pulse shadow-3xl scale-105 ring-4 ring-red-400/30 bg-red-400/5 border-red-400/20",
            // Processing state - blue glow
            isProcessing &&
              "ring-4 ring-blue-400/40 bg-blue-400/8 border-blue-400/25",
            // Profile matched state - green glow
            isProfileMatched &&
              "ring-4 ring-emerald-400/40 bg-emerald-400/8 border-emerald-400/25",
          )}
        >
          {/* Processing progress ring - positioned on the outer edge */}
          {isProcessing && (
            <div className="absolute -inset-1 rounded-full">
              <svg
                className="w-full h-full transform -rotate-90"
                viewBox="0 0 100 100"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="48"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  strokeDasharray="302"
                  strokeDashoffset="302"
                  className="animate-pulse"
                  style={{
                    animation: "progress-ring 2s linear infinite",
                  }}
                />
              </svg>
            </div>
          )}

          {/* Profile matched success ring - positioned on the outer edge */}
          {isProfileMatched && (
            <div className="absolute -inset-1 rounded-full">
              <svg
                className="w-full h-full transform -rotate-90"
                viewBox="0 0 100 100"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="48"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray="302"
                  strokeDashoffset="0"
                />
              </svg>
            </div>
          )}

          {/* Premium inner glow and reflection effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-white/3 rounded-full" />
          <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-gradient-to-b from-white/10 to-transparent rounded-full blur-sm" />

          {/* Content overlay - clean and minimal */}
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6 p-8 z-10">
            <VoiceMicrophone
              isListening={isListening}
              onStartListening={startRecording}
              onStopListening={stopRecording}
              isProcessing={isProcessing}
            />
          </div>
        </div>

        {/* Subtle instruction tooltip */}
        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="bg-black/80 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-lg shadow-lg border border-white/10">
            {hasPermission
              ? "Click to start voice command"
              : "Click to enable microphone"}
          </div>
        </div>

        {/* Progress ring animation */}
        <style jsx>{`
          @keyframes progress-ring {
            0% {
              stroke-dashoffset: 302;
            }
            100% {
              stroke-dashoffset: 0;
            }
          }
        `}</style>
      </div>

      {/* Permission Request Modal */}
      {showPermissionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
            <div className="text-center space-y-6">
              {/* Icon */}
              <div className="w-20 h-20 mx-auto bg-yellow-400/20 rounded-full flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              </div>

              {/* Content */}
              <div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  Microphone Access Required
                </h3>
                <p className="text-blue-200 text-lg mb-6">
                  Pitch Perfect needs microphone access to identify your voice
                  and match you with your profile.
                </p>

                {/* Buttons */}
                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowPermissionModal(false)}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 border border-white/20"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={requestMicrophonePermission}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 hover:scale-105"
                  >
                    Allow Access
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Modal */}
      {isRequestingPermission && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
            <div className="text-center space-y-6">
              {/* Loading Spinner */}
              <div className="w-20 h-20 mx-auto bg-blue-400/20 rounded-full flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              </div>

              {/* Content */}
              <div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  Requesting Permission
                </h3>
                <p className="text-blue-200 text-lg">
                  Please allow microphone access in the browser prompt that
                  appears.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
