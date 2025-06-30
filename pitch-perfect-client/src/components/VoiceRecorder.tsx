"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { MicrophoneIcon } from "@/components/atoms/MicrophoneIcon";

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceRecorder({
  onRecordingComplete,
  onError,
  disabled = false,
  className = "",
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        onRecordingComplete(audioBlob);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      onError?.(
        "Failed to start recording. Please check microphone permissions.",
      );
    }
  }, [onRecordingComplete, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const playRecording = useCallback(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);

      audioRef.current.onended = () => {
        setIsPlaying(false);
      };
    }
  }, [audioUrl]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {!isRecording && !audioUrl && (
        <Button
          onClick={startRecording}
          disabled={disabled}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <MicrophoneIcon className="h-4 w-4" />
          Record Voice
        </Button>
      )}

      {isRecording && (
        <div className="flex items-center gap-2">
          <Button
            onClick={stopRecording}
            variant="destructive"
            size="sm"
            className="flex items-center gap-2"
          >
            <StopIcon className="h-4 w-4" />
            Stop ({formatTime(recordingTime)})
          </Button>
        </div>
      )}

      {audioUrl && !isRecording && (
        <div className="flex items-center gap-2">
          <Button
            onClick={playRecording}
            disabled={isPlaying}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <PlayIcon className="h-4 w-4" />
            {isPlaying ? "Playing..." : "Play"}
          </Button>

          <Button
            onClick={() => {
              setAudioUrl(null);
              setRecordingTime(0);
            }}
            variant="ghost"
            size="sm"
          >
            Clear
          </Button>
        </div>
      )}

      <audio ref={audioRef} src={audioUrl || undefined} />
    </div>
  );
}

// Simple icon components
function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <rect x="6" y="6" width="8" height="8" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <polygon points="6,4 16,10 6,16" />
    </svg>
  );
}
