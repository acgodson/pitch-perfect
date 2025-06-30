import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Mic,
  Play,
  Pause,
  RotateCcw,
  Check,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";

interface VoiceRegistrationProps {
  profileData: {
    name: string;
    emoji: string;
    isAdult: boolean;
  };
  onComplete: (userId: string) => void;
  onBack: () => void;
}

type RegistrationStatus =
  | "recording"
  | "ready_to_complete"
  | "sending_to_agent"
  | "agent_processing"
  | "success"
  | "error";

export const VoiceRegistration = ({
  profileData,
  onComplete,
  onBack,
}: VoiceRegistrationProps) => {
  const {
    registrationState,
    handleCompleteRegistration,
    startRecording,
    stopRecording,
    resetRecording,
    handleNextPhrase,
  } = useProfile();

  const {
    currentStep,
    isRecording,
    recordings,
    isLoading,
    error,
    currentPhrase,
    progress,
    isReadyToComplete,
    agentResponse,
  } = registrationState;

  const requiredPhrases = 2;

  // Local state for audio playback and status tracking
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(
    null,
  );
  const [registrationStatus, setRegistrationStatus] =
    useState<RegistrationStatus>("recording");
  const [statusMessage, setStatusMessage] = useState("");
  const [showDebug, setShowDebug] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // Add debug log function
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[VoiceRegistration] ${message}`);
  };

  // Update status when ready to complete
  useEffect(() => {
    if (isReadyToComplete && registrationStatus === "recording") {
      setRegistrationStatus("ready_to_complete");
      setStatusMessage("Ready to complete registration");
      addDebugLog("Ready to complete registration - all phrases recorded");
    }
  }, [isReadyToComplete, registrationStatus]);

  // Update status based on registration state - but prioritize agent responses
  useEffect(() => {
    if (isLoading && !agentResponse) {
      setRegistrationStatus("agent_processing");
      setStatusMessage("Agent is processing your voice registration...");
      addDebugLog("Agent started processing voice registration...");
    } else if (error) {
      setRegistrationStatus("error");
      setStatusMessage(`Error: ${error}`);
      addDebugLog(`Registration error: ${error}`);
    }
  }, [isLoading, error, agentResponse]);

  // Log agent responses and use them as status message - this takes priority
  useEffect(() => {
    if (agentResponse) {
      addDebugLog(`Agent response: ${agentResponse}`);
      setStatusMessage(agentResponse);
      // If we get a successful response, mark as success
      if (
        agentResponse.includes("successful") ||
        agentResponse.includes("🎉")
      ) {
        setRegistrationStatus("success");
      }
    }
  }, [agentResponse]);

  // Add debug logs for recording events
  useEffect(() => {
    if (recordings.length > 0) {
      addDebugLog(`Phrase ${recordings.length} recorded successfully`);
    }
  }, [recordings.length]);

  const handleRecordClick = async () => {
    if (isRecording) {
      stopRecording();
      addDebugLog("Recording stopped");
    } else {
      await startRecording();
      addDebugLog("Recording started");
    }
  };

  const handleNext = () => {
    if (recordings.length > currentStep) {
      handleNextPhrase();
      addDebugLog(`Advanced to phrase ${currentStep + 2}`);
    }
  };

  const handlePlayRecording = () => {
    if (recordings.length > currentStep) {
      const audioBlob = recordings[currentStep];
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentAudio(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.play();
      setIsPlaying(true);
      setCurrentAudio(audio);
      addDebugLog("Playing back current recording");
    }
  };

  const handleStopPlayback = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setIsPlaying(false);
      setCurrentAudio(null);
      addDebugLog("Playback stopped");
    }
  };

  const handleClearRecording = () => {
    resetRecording();
    if (currentAudio) {
      currentAudio.pause();
      setIsPlaying(false);
      setCurrentAudio(null);
    }
    addDebugLog("Current recording cleared");
  };

  const handleCompleteRegistrationClick = async () => {
    addDebugLog("User clicked Complete Registration");
    setRegistrationStatus("sending_to_agent");
    setStatusMessage("Sending voice data to agent...");

    try {
      await handleCompleteRegistration(profileData, (userId) => {
        setRegistrationStatus("success");
        setStatusMessage("Registration successful!");
        addDebugLog(`Registration completed successfully! User ID: ${userId}`);
        onComplete(userId);
      });
    } catch (error) {
      addDebugLog(`Registration failed: ${error}`);
      setRegistrationStatus("error");
      setStatusMessage(`Registration failed: ${error}`);
    }
  };

  const canProceed = recordings.length > currentStep;
  const hasCurrentRecording = recordings.length > currentStep;
  const isLastPhrase = currentStep === requiredPhrases - 1;
  const isProcessing = ["agent_processing", "sending_to_agent"].includes(
    registrationStatus,
  );

  // Debug logging for navigation logic
  useEffect(() => {
    addDebugLog(
      `Navigation state: recordings=${recordings.length}, currentStep=${currentStep}, canProceed=${canProceed}, hasCurrentRecording=${hasCurrentRecording}, isReadyToComplete=${isReadyToComplete}`,
    );
  }, [
    recordings.length,
    currentStep,
    canProceed,
    hasCurrentRecording,
    isReadyToComplete,
  ]);

  // Status indicator component
  const StatusIndicator = ({
    status,
    message,
  }: {
    status: RegistrationStatus;
    message: string;
  }) => {
    const getStatusIcon = () => {
      switch (status) {
        case "recording":
          return <Mic size={20} className="text-blue-400" />;
        case "ready_to_complete":
          return <Check size={20} className="text-emerald-400" />;
        case "sending_to_agent":
        case "agent_processing":
          return <Loader2 size={20} className="text-blue-400 animate-spin" />;
        case "success":
          return <Check size={20} className="text-emerald-400" />;
        case "error":
          return <AlertCircle size={20} className="text-red-400" />;
        default:
          return <Mic size={20} className="text-blue-400" />;
      }
    };

    const getStatusColor = () => {
      switch (status) {
        case "recording":
          return "text-blue-400";
        case "ready_to_complete":
          return "text-emerald-400";
        case "sending_to_agent":
        case "agent_processing":
          return "text-blue-400";
        case "success":
          return "text-emerald-400";
        case "error":
          return "text-red-400";
        default:
          return "text-blue-400";
      }
    };

    return (
      <div className="flex items-center space-x-2 text-sm">
        {getStatusIcon()}
        <span className={getStatusColor()}>{message}</span>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <Mic size={48} className="mx-auto text-blue-400" />
        <h3 className="text-lg font-medium text-white">Voice Registration</h3>
        <p className="text-blue-200 text-sm">
          Record {requiredPhrases} phrases to create your voice profile
        </p>
        <div className="text-sm text-white/60">
          Step {currentStep + 1} of {requiredPhrases}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/10 rounded-full h-2 mt-4">
          <div
            className="bg-gradient-to-r from-blue-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Status Indicator */}
        {(registrationStatus !== "recording" || statusMessage) && (
          <div className="mt-4">
            <StatusIndicator
              status={registrationStatus}
              message={statusMessage}
            />
          </div>
        )}

        {/* Debug Toggle */}
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDebug(!showDebug)}
            className="border-white/20 text-white hover:bg-white/10"
          >
            {showDebug ? <EyeOff size={16} /> : <Eye size={16} />}
            <span className="ml-2">{showDebug ? "Hide" : "Show"} Debug</span>
          </Button>
        </div>
      </div>

      {/* Debug Panel */}
      {showDebug && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-black/20 rounded-lg p-4 border border-white/10"
        >
          <h4 className="text-white font-medium mb-2">Debug Logs:</h4>
          <div className="bg-black/40 rounded p-3 max-h-32 overflow-y-auto">
            {debugLogs.length === 0 ? (
              <p className="text-white/60 text-sm">No logs yet...</p>
            ) : (
              debugLogs.map((log, index) => (
                <div
                  key={index}
                  className="text-green-400 text-xs font-mono mb-1"
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* Current Phrase - Only show when not processing */}
      {!isProcessing && (
        <div className="bg-white/5 rounded-lg p-6 border border-white/10">
          <div className="text-center space-y-4">
            <h4 className="text-white font-medium">
              Read this phrase clearly:
            </h4>
            <div className="text-lg text-blue-200 bg-white/5 rounded-lg p-4 border border-white/10">
              "{currentPhrase}"
            </div>
          </div>
        </div>
      )}

      {/* Recording Controls - Only show when not processing */}
      {!isProcessing && (
        <div className="flex items-center justify-center space-x-4">
          <Button
            onClick={handleRecordClick}
            disabled={isLoading}
            className={`w-16 h-16 rounded-full ${
              isRecording
                ? "bg-red-500 hover:bg-red-600 animate-pulse"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {isRecording ? <Pause size={24} /> : <Mic size={24} />}
          </Button>

          {/* Play/Stop Button - shown when there's a recording */}
          {hasCurrentRecording && (
            <Button
              onClick={isPlaying ? handleStopPlayback : handlePlayRecording}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className={`border-white/20 text-white hover:bg-white/10 ${
                isPlaying ? "bg-yellow-500/20 border-yellow-400" : ""
              }`}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </Button>
          )}

          {/* Clear Button - shown when there's a recording */}
          {hasCurrentRecording && (
            <Button
              onClick={handleClearRecording}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <RotateCcw size={16} />
            </Button>
          )}
        </div>
      )}

      {/* Status Messages - Only show during recording, not during processing */}
      {isRecording && (
        <div className="text-center">
          <div className="text-emerald-400 text-sm font-medium">
            Recording...
          </div>
          <div className="text-white/60 text-xs">
            Speak clearly into your microphone
          </div>
        </div>
      )}

      {hasCurrentRecording &&
        !isRecording &&
        registrationStatus === "recording" && (
          <div className="text-center">
            <div className="text-emerald-400 text-sm font-medium flex items-center justify-center space-x-2">
              <Check size={16} />
              <span>Phrase recorded</span>
            </div>
            <div className="text-white/60 text-xs">
              {recordings.length === requiredPhrases
                ? "Ready to complete registration"
                : "Click Next to continue or record again"}
            </div>
          </div>
        )}

      {registrationStatus === "ready_to_complete" && (
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Check size={16} className="text-emerald-400" />
            <span className="text-emerald-400 text-sm font-medium">
              Ready to Complete
            </span>
          </div>
          <div className="text-white/60 text-xs">
            All phrases recorded. Click "Complete Registration" to proceed.
          </div>
        </div>
      )}

      {/* Processing Status - Only show when processing and no agent response yet */}
      {registrationStatus === "agent_processing" && !statusMessage && (
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 size={20} className="animate-spin text-blue-400" />
            <span className="text-blue-400 text-sm font-medium">
              Agent Processing
            </span>
          </div>
          <div className="text-white/60 text-xs">
            Extracting voice embeddings and creating your profile...
          </div>
        </div>
      )}

      {/* Success with Launch Button */}
      {registrationStatus === "success" && (
        <div className="text-center space-y-4">
          <div className="bg-emerald-400/10 rounded-lg p-4 border border-emerald-400/20">
            <div className="flex items-center justify-center space-x-2 mb-3">
              <Check size={20} className="text-emerald-400" />
              <span className="text-emerald-400 text-sm font-medium">
                Registration Successful!
              </span>
            </div>
            <div className="text-white/80 text-sm mb-4">
              Your voice profile has been created successfully. You can now use voice commands to access your account.
            </div>
            <Button
              onClick={() => onComplete("user-id")}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
            >
              Launch Profile
            </Button>
          </div>
        </div>
      )}

      {/* Agent Response Display - Only show during processing, not after success */}
      {statusMessage &&
        registrationStatus === "agent_processing" && (
          <div className="text-center space-y-4">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="text-white text-sm whitespace-pre-line">
                {statusMessage}
              </div>
            </div>
          </div>
        )}

      {registrationStatus === "error" && (
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <AlertCircle size={16} className="text-red-400" />
            <span className="text-red-400 text-sm font-medium">
              Registration Failed
            </span>
          </div>
          <div className="text-white/60 text-xs">{statusMessage}</div>
        </div>
      )}

      {/* Navigation Buttons - Only show when not processing */}
      {!isProcessing && (
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
            className="flex-1 border-white/20 text-white hover:bg-white/10"
          >
            Back
          </Button>

          {/* Show Next Phrase button if we have a recording for current step and not at the last phrase */}
          {hasCurrentRecording && currentStep < requiredPhrases - 1 && (
            <Button
              onClick={handleNext}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              Next Phrase
            </Button>
          )}

          {/* Show Complete Registration button if we have all phrases and are ready */}
          {isReadyToComplete && (
            <Button
              onClick={handleCompleteRegistrationClick}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
            >
              Complete Registration
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
};
