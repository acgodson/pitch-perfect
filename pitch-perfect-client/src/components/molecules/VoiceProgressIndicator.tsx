import { Card, CardContent } from "@/components/ui/card";
import { CircularProgress } from "@/components/atoms";

type Stage = "listening" | "processing" | "complete";

interface VoiceProgressIndicatorProps {
  stage?: Stage;
  progress?: number;
  message: string;
}

export const VoiceProgressIndicator = ({
  stage = "listening",
  progress = 0,
  message,
}: VoiceProgressIndicatorProps) => {
  const stageIcons: Record<Stage, string> = {
    listening: "🎧",
    processing: "🧠",
    complete: "✅",
  };

  return (
    <Card className="w-64">
      <CardContent className="flex flex-col items-center space-y-4 p-6">
        <CircularProgress progress={progress} size={80} />
        <div className="text-center space-y-2">
          <div className="text-3xl">{stageIcons[stage]}</div>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
};
