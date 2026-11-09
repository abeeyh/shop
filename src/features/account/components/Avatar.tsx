import { Crown, Flame, Gem, Ghost, Shield, Skull, Sword, WandSparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { type AvatarKey, isAvatar } from "../avatars";

const ICONS: Record<AvatarKey, LucideIcon> = {
  sword: Sword,
  shield: Shield,
  wand: WandSparkles,
  skull: Skull,
  crown: Crown,
  flame: Flame,
  ghost: Ghost,
  gem: Gem,
};

// #162: avatar pronto (ícone no gradiente do tema) ou a inicial do nome/e-mail. Decorativo: quem usa dá o nome.
export function Avatar({
  avatar,
  name,
  className,
}: {
  avatar: string | null;
  name: string;
  className?: string;
}) {
  const Icon = isAvatar(avatar) ? ICONS[avatar] : null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full bg-linear-[135deg] from-gradient-from to-gradient-to font-heading font-bold text-primary-foreground",
        className,
      )}
    >
      {Icon ? <Icon className="size-[55%]" /> : (name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}

export const AVATAR_ICONS = ICONS;
