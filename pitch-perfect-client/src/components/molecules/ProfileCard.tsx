import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/atoms";
import { cn } from "@/lib/utils";

interface Profile {
  avatar?: string;
  name: string;
  role: string;
  isActive?: boolean;
}

interface ProfileCardProps {
  profile: Profile;
  isHighlighted?: boolean;
  onClick?: (profile: Profile) => void;
  className?: string;
}

export const ProfileCard = ({
  profile,
  isHighlighted = false,
  onClick,
  className,
}: ProfileCardProps) => (
  <Card
    className={cn(
      "cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg",
      isHighlighted && "ring-2 ring-primary ring-offset-2 scale-105 shadow-xl",
      className,
    )}
    onClick={() => onClick?.(profile)}
  >
    <CardContent className="flex flex-col items-center space-y-3 p-6">
      <Avatar
        src={profile.avatar}
        name={profile.name}
        size="xl"
        isOnline={profile.isActive}
      />
      <div className="text-center space-y-1">
        <h3 className="font-semibold">{profile.name}</h3>
        <Badge variant="secondary">{profile.role}</Badge>
      </div>
    </CardContent>
  </Card>
);
