import { Castle, Coins, ShieldCheck } from "lucide-react";

const ICONS = { gold: Coins, raid: ShieldCheck, dungeon: Castle } as const;

export function KindIcon({ kind, className }: { kind: keyof typeof ICONS; className?: string }) {
  const Icon = ICONS[kind];
  return <Icon aria-hidden="true" className={className} strokeWidth={1.6} />;
}

// Miniatura em gradiente (docs/15: arte final própria ou licenciada; por ora gradiente + ícone)
export function KindThumb({ kind, badge }: { kind: keyof typeof ICONS; badge?: string }) {
  return (
    <div className="relative mb-3.5 grid aspect-[16/10] place-items-center rounded-md bg-linear-[116.85deg] from-gradient-from to-gradient-to text-white">
      <KindIcon kind={kind} className="size-14" />
      {badge ? (
        <span className="absolute top-2.5 left-2.5 rounded-full bg-background/85 px-3 py-1 font-heading text-xs font-semibold text-white">
          {badge}
        </span>
      ) : null}
    </div>
  );
}
