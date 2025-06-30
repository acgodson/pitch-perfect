import { cn } from "@/lib/utils";

interface PulseRingProps {
  size?: number;
  delay?: number;
  className?: string;
}

export const PulseRing = ({
  size = 200,
  delay = 0,
  className,
}: PulseRingProps) => (
  <div
    className={cn(
      "absolute rounded-full border-2 border-white/30 animate-ping",
      className,
    )}
    style={{
      width: `${size}px`,
      height: `${size}px`,
      animationDelay: `${delay}ms`,
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      maxWidth: "100%",
      maxHeight: "100%",
      boxSizing: "border-box",
    }}
  />
);
