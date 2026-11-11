import Link from "next/link";
import { buttonVariants } from "@/components/atoms/Button";
import { PriceTag } from "@/components/molecules/PriceTag";
import { KindIcon } from "./KindIcon";
import type { ProductCardData } from "./ProductCard";

type Props = { p: ProductCardData; cta: string; flag?: string; hideTag?: string | null };

const chip = "max-w-full truncate rounded-full px-2 py-0.5 text-xs font-semibold";

// #166: produto em cartão (vista em grade) — ícone grande da categoria, nome, etiquetas, preço e "Comprar".
// O cartão inteiro é o link (um por produto, acessível); "Comprar" é só o rótulo visual.
export function ProductTile({ p, cta, flag, hideTag }: Props) {
  return (
    <article
      data-spotlight
      className="relative flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card/60 p-4 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-gradient-from/50"
    >
      <div className="grid aspect-[16/9] place-items-center rounded-md bg-linear-[135deg] from-gradient-from/25 to-gradient-to/10 text-heading ring-1 ring-border">
        <KindIcon kind={p.kind} className="size-14 drop-shadow-[0_0_18px_var(--gradient-from)]" />
      </div>
      <h3 className="font-heading text-[15px] font-semibold [overflow-wrap:anywhere] text-heading">
        <Link
          href={p.href}
          className="after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
        >
          {p.name}
        </Link>
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {p.badge ? <span className={`badge-glow text-heading ${chip}`}>{p.badge}</span> : null}
        {flag ? <span className={`bg-destructive/20 text-error-text ${chip}`}>{flag}</span> : null}
        {p.tags
          .filter((t) => t !== hideTag)
          .map((t) => (
            <span key={t} className={`bg-secondary text-foreground ${chip}`}>
              {t}
            </span>
          ))}
      </div>
      {/* #180: sem espaço, o botão desce para a linha de baixo em vez de sair do cartão */}
      <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
        <PriceTag price={p.price} original={p.original} unit={p.unit} size="sm" />
        <span
          aria-hidden="true"
          className={`${buttonVariants({ variant: "gradient-outline", size: "sm" })} shrink-0`}
        >
          {cta}
        </span>
      </div>
    </article>
  );
}
