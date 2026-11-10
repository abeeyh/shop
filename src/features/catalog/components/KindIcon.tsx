import { KIND_ICONS } from "./kind-icons";

export type Kind = keyof typeof KIND_ICONS; // RN-13

// #166: SVG próprio do tipo da categoria (game-icons.net, CC BY 3.0); decorativo — o nome vem do texto ao lado
export function KindIcon({ kind, className }: { kind: Kind; className?: string }) {
  return (
    <svg viewBox="0 0 512 512" fill="currentColor" aria-hidden="true" focusable="false" className={className}>
      <path d={KIND_ICONS[kind].d} />
    </svg>
  );
}

// #102: ícone em quadradinho com gradiente suave (linhas de produto, carrinho, categorias)
export function KindTile({ kind }: { kind: Kind }) {
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-md bg-linear-[135deg] from-gradient-from/25 to-gradient-to/15 text-heading ring-1 ring-border">
      <KindIcon kind={kind} className="size-6" />
    </span>
  );
}
