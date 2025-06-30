import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string;
  size?: number;
  className?: string;
  children?: React.ReactNode;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  size = 40,
  className,
  children,
}) => {
  return (
    <div
      className={cn(
        "relative inline-block rounded-full overflow-hidden bg-transparent",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {children ||
        (src && (
          <Image
            src={src}
            alt="Avatar"
            layout="fill"
            objectFit="cover"
            className="transition-opacity duration-300 ease-in-out"
            onLoadingComplete={(image) => image.classList.remove("opacity-0")}
          />
        ))}
    </div>
  );
};

interface AvatarImageProps {
  src?: string;
  alt?: string;
  className?: string;
}

export const AvatarImage: React.FC<AvatarImageProps> = ({
  src,
  alt = "Avatar",
  className,
}) => {
  if (!src) return null;

  return (
    <Image
      src={src}
      alt={alt}
      layout="fill"
      objectFit="cover"
      className={cn("transition-opacity duration-300 ease-in-out", className)}
      onLoadingComplete={(image) => image.classList.remove("opacity-0")}
    />
  );
};

interface AvatarFallbackProps {
  children: React.ReactNode;
  className?: string;
}

export const AvatarFallback: React.FC<AvatarFallbackProps> = ({
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
};

export default Avatar;
