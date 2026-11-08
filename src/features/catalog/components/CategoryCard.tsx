import Link from "next/link";
import { KindTile, type Kind } from "./KindIcon";

type Props = { href: string; name: string; kind: Kind };

// #102: categoria em bloco compacto (ícone + nome) — todas cabem numa olhada, 1 clique até a lista
export function CategoryCard({ href, name, kind }: Props) {
  return (
    <Link
      href={href}
      data-spotlight
      className="flex min-h-16 items-center gap-3 rounded-lg border border-border bg-card/60 px-3.5 py-3 font-heading text-sm font-semibold text-heading transition-colors hover:border-gradient-from/50"
    >
      <KindTile kind={kind} />
      {name}
    </Link>
  );
}
