import { Castle, Coins, Pickaxe, ShieldCheck, Swords, Trophy } from "lucide-react";

const ICONS = {
  gold: Coins,
  raid: ShieldCheck,
  dungeon: Castle,
  pvp: Swords,
  achievement: Trophy,
  delve: Pickaxe,
} as const;
export type Kind = keyof typeof ICONS; // RN-13

export function KindIcon({ kind, className }: { kind: keyof typeof ICONS; className?: string }) {
  const Icon = ICONS[kind];
  return <Icon aria-hidden="true" className={className} strokeWidth={1.6} />;
}

// #102: ícone em quadradinho com gradiente suave (linhas de produto, carrinho, categorias)
export function KindTile({ kind }: { kind: keyof typeof ICONS }) {
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-md bg-linear-[135deg] from-gradient-from/25 to-gradient-to/15 text-heading ring-1 ring-white/10">
      <KindIcon kind={kind} className="size-5" />
    </span>
  );
}
