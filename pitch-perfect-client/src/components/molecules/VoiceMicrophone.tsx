import { Button } from "@/components/ui/button";
import { MicrophoneIcon, SoundWave } from "@/components/atoms";
import { cn } from "@/lib/utils";

interface VoiceMicrophoneProps {
  isListening?: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  className?: string;
  isProcessing?: boolean;
}

export const VoiceMicrophone = ({
  isListening = false,
  onStartListening,
  onStopListening,
  className,
  isProcessing = false,
}: VoiceMicrophoneProps) => (
  <div className={cn("relative flex items-center justify-center", className)}>
    {/* Main microphone button - premium glass morphism */}
    <Button
      variant={isListening ? "default" : "outline"}
      size="lg"
      className={cn(
        "relative z-10 h-32 w-32 rounded-full transition-all duration-500",
        "bg-white/15 backdrop-blur-md border-2 border-white/25",
        "hover:bg-white/25 hover:border-white/40 hover:scale-110 hover:shadow-3xl",
        "shadow-2xl active:scale-95",
        "group", // For group hover effects
        isListening &&
          "bg-red-400/30 border-red-400/50 animate-pulse shadow-3xl ring-4 ring-red-400/20",
        isProcessing &&
          "bg-blue-400/20 border-blue-400/50 animate-pulse shadow-3xl ring-4 ring-blue-400/30",
      )}
      onClick={isListening ? onStopListening : onStartListening}
      disabled={isProcessing}
    >
      {/* Inner glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-full" />

      {/* Microphone icon with enhanced styling */}
      <div className="relative z-10 group-hover:scale-110 transition-transform duration-300">
        <MicrophoneIcon
          size={48}
          isActive={isListening || isProcessing}
          className={cn(
            "drop-shadow-lg",
            isListening && "text-red-400",
            isProcessing && "text-blue-400",
          )}
        />
      </div>

      {/* Recording indicator */}
      {isListening && (
        <div className="absolute top-2 right-2 w-3 h-3 bg-red-400 rounded-full animate-pulse" />
      )}

      {/* Subtle pulse ring when hovering */}
      <div className="absolute inset-0 rounded-full border-2 border-white/20 group-hover:animate-ping opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </Button>

    {/* Enhanced sound waves with better positioning */}
    {(isListening || isProcessing) && (
      <div className="absolute -bottom-8 flex items-end space-x-1 z-20">
        {[12, 24, 18, 30, 16].map((height, i) => (
          <SoundWave
            key={i}
            height={height}
            delay={i * 100}
            isActive={isListening || isProcessing}
          />
        ))}
      </div>
    )}
  </div>
);
