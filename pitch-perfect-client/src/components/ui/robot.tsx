import { createAvatar } from "@dicebear/core";
import { bottts } from "@dicebear/collection";
import { Avatar } from "./avatar";

export default function Robot() {
  const avatar = createAvatar(bottts, {
    seed: "AIFusionFx",
  });

  return (
    <div>
      <Avatar src={avatar.toDataUri()} size={64} />
    </div>
  );
}
