import { cn } from "@/lib/utils";

interface SoundWaveProps {
  height?: number;
  delay?: number;
  isActive?: boolean;
}

export const SoundWave = ({
  height = 20,
  delay = 0,
  isActive = false,
}: SoundWaveProps) => (
  <div
    className={cn(
      "w-1 bg-primary/60 rounded-full transition-all duration-300",
      isActive ? "animate-bounce" : "h-1",
    )}
    style={{
      height: isActive ? `${height}px` : "4px",
      animationDelay: `${delay}ms`,
    }}
  />
);
