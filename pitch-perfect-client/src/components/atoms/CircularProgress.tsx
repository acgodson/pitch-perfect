import { cn } from "@/lib/utils";

interface CircularProgressProps {
  progress?: number;
  size?: number;
  className?: string;
}

export const CircularProgress = ({
  progress = 0,
  size = 100,
  className,
}: CircularProgressProps) => (
  <div
    className={cn("relative", className)}
    style={{ width: size, height: size }}
  >
    <svg className="transform -rotate-90" width={size} height={size}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={(size - 8) / 2}
        stroke="currentColor"
        strokeWidth="8"
        fill="transparent"
        className="text-muted"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={(size - 8) / 2}
        stroke="currentColor"
        strokeWidth="8"
        fill="transparent"
        strokeDasharray={`${(progress / 100) * 2 * Math.PI * ((size - 8) / 2)} ${2 * Math.PI * ((size - 8) / 2)}`}
        className="text-primary transition-all duration-300"
      />
    </svg>
  </div>
);
