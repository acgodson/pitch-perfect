// atoms/MicrophoneIcon.jsx
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface MicrophoneIconProps {
  size?: number;
  className?: string;
  isActive?: boolean;
}

export const MicrophoneIcon = ({
  size = 24,
  className,
  isActive = false,
}: MicrophoneIconProps) => {
  const Icon = isActive ? Mic : MicOff;

  return (
    <Icon
      size={size}
      className={cn(
        "transition-all duration-300 drop-shadow-lg",
        isActive && "text-white animate-pulse drop-shadow-xl",
        className,
      )}
    />
  );
};
