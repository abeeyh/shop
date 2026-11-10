import Link from "next/link";
import { KindTile, type Kind } from "./KindIcon";

type Props = { href: string; name: string; kind: Kind };

// #102: categoria em bloco compacto (ícone + nome) — todas cabem numa olhada, 1 clique até a lista.
// #164: no desktop (7 numa linha) o ícone vai em cima do nome para o nome não estourar o bloco
export function CategoryCard({ href, name, kind }: Props) {
  return (
    <Link
      href={href}
      data-spotlight
      className="flex min-h-16 min-w-0 items-center gap-3 rounded-lg border border-border bg-card/60 px-3.5 py-3 font-heading text-sm font-semibold break-words text-heading transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-gradient-from/50 lg:flex-col lg:justify-center lg:gap-2 lg:text-center"
    >
      <KindTile kind={kind} />
      {name}
    </Link>
  );
}
