import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/atoms";
import { cn } from "@/lib/utils";

interface Contact {
  avatar?: string;
  name: string;
  primaryAddress: string;
  chains?: string[];
}

interface ContactItemProps {
  contact: Contact;
  onSelect?: (contact: Contact) => void;
  className?: string;
}

export const ContactItem = ({
  contact,
  onSelect,
  className,
}: ContactItemProps) => (
  <Card
    className={cn(
      "cursor-pointer transition-colors hover:bg-muted/50",
      className,
    )}
    onClick={() => onSelect?.(contact)}
  >
    <CardContent className="flex items-center space-x-4 p-4">
      <Avatar src={contact.avatar} name={contact.name} />
      <div className="flex-1 space-y-1">
        <h4 className="text-sm font-semibold">{contact.name}</h4>
        <p className="text-xs text-muted-foreground font-mono">
          {contact.primaryAddress}
        </p>
        <div className="flex space-x-1">
          {contact.chains?.map((chain) => (
            <Badge key={chain} variant="outline" className="text-xs">
              {chain}
            </Badge>
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
);
