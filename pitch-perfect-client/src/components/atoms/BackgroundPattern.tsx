import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BackgroundPatternProps {
  children: ReactNode;
  className?: string;
}

export const BackgroundPattern = ({
  children,
  className,
}: BackgroundPatternProps) => {
  return (
    <div
      className={cn(
        "min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 relative overflow-hidden",
        className,
      )}
    >
      {/* Dramatic animated background elements */}
      <div className="absolute inset-0">
        {/* Primary gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-500/18 to-indigo-600/18 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-gradient-to-br from-indigo-500/15 to-blue-500/15 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-slate-500/12 to-blue-500/12 rounded-full blur-2xl animate-pulse delay-2000" />

        {/* Secondary accent orbs */}
        <div className="absolute top-1/6 right-1/6 w-32 h-32 bg-gradient-to-br from-blue-400/18 to-indigo-400/18 rounded-full blur-xl animate-pulse delay-500" />
        <div className="absolute bottom-1/6 left-1/6 w-40 h-40 bg-gradient-to-br from-indigo-400/15 to-slate-400/15 rounded-full blur-xl animate-pulse delay-1500" />
      </div>

      {/* Modern mesh gradient pattern overlay */}
      <div className="absolute inset-0 opacity-15">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
            radial-gradient(ellipse 800px 600px at 20% 20%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse 600px 800px at 80% 80%, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse 400px 400px at 50% 50%, rgba(59, 130, 246, 0.05) 0%, transparent 50%),
            radial-gradient(ellipse 300px 300px at 10% 90%, rgba(99, 102, 241, 0.06) 0%, transparent 50%),
            radial-gradient(ellipse 300px 300px at 90% 10%, rgba(59, 130, 246, 0.06) 0%, transparent 50%)
          `,
          }}
        />
      </div>

      {/* Subtle mesh gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-blue-950/20 to-indigo-950/25" />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};
