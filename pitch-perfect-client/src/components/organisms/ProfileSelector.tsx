"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProfileCard } from "@/components/molecules";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// Extend the Profile interface to include id for ProfileSelector
interface ProfileWithId {
  id: string;
  avatar?: string;
  name: string;
  role: string;
  isActive?: boolean;
}

interface ProfileSelectorProps {
  profiles?: ProfileWithId[];
  onProfileSelect?: (profile: ProfileWithId) => void;
  detectedProfile?: string;
  className?: string;
}

export const ProfileSelector = ({
  profiles = [],
  onProfileSelect,
  detectedProfile,
  className,
}: ProfileSelectorProps) => (
  <div className={cn("w-full max-w-4xl mx-auto space-y-8", className)}>
    <div className="text-center space-y-2">
      <h1 className="text-4xl font-bold text-white">
        Who's using your wallet today?
      </h1>
      <p className="text-white/80">
        Say something to get started, or click your profile
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {profiles.map((profile) => (
        <ProfileCard
          key={profile.id}
          profile={profile}
          isHighlighted={detectedProfile === profile.id}
          onClick={(selectedProfile) => onProfileSelect?.(profile)}
        />
      ))}

      <Card className="cursor-pointer transition-all hover:scale-105 hover:shadow-lg border-dashed">
        <CardContent className="flex flex-col items-center justify-center space-y-3 p-6 h-full">
          <Plus size={32} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Add Profile</p>
        </CardContent>
      </Card>
    </div>
  </div>
);
