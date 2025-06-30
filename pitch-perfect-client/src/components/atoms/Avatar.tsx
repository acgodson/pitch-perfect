// atoms/Avatar.jsx
import {
  Avatar as ShadcnAvatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  isOnline?: boolean;
  className?: string;
}

export const Avatar = ({
  src,
  name,
  size = "md",
  isOnline = false,
  className,
}: AvatarProps) => {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
    xl: "h-24 w-24",
  };

  return (
    <div className={cn("relative", className)}>
      <ShadcnAvatar className={cn(sizeClasses[size])}>
        <AvatarImage src={src} alt={name} />
        <AvatarFallback>{name?.charAt(0)}</AvatarFallback>
      </ShadcnAvatar>
      {isOnline && (
        <Badge
          variant="secondary"
          className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-green-500 p-0"
        >
          <span className="sr-only">Online</span>
        </Badge>
      )}
    </div>
  );
};
