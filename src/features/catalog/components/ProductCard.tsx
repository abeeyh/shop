import Link from "next/link";
import { buttonVariants } from "@/components/atoms/Button";
import { PriceTag } from "@/components/molecules/PriceTag";
import { KindTile, type Kind } from "./KindIcon";

export type ProductCardData = {
  href: string;
  name: string;
  kind: Kind;
  badge?: string; // "Popular" (produto em destaque)
  tags: string[]; // subcategoria (Heroic, Mythic…)
  description: string;
  price: string;
  original?: string; // RN-22: preço sem promoção, riscado
  unit?: string; // "por 1.000 gold", "a partir de"
};

// #102: produto em linha (lista densa, minimalista): ícone · nome + etiquetas · preço · "Comprar".
// A linha inteira é o link (um só por produto, acessível); "Comprar" é só o rótulo visual dele.
export function ProductCard({ p, cta, flag }: { p: ProductCardData; cta: string; flag?: string }) {
  return (
    <div
      data-spotlight
      className="grid grid-cols-[2.75rem_1fr_auto] items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-card/60 px-4 py-3.5 transition-colors hover:border-gradient-from/50 sm:grid-cols-[2.75rem_1fr_auto_auto]"
    >
      <KindTile kind={p.kind} />
      <div className="min-w-0">
        <h3 className="font-heading text-[15px] font-semibold text-heading">
          <Link
            href={p.href}
            className="after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
          >
            {p.name}
          </Link>
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {p.badge ? (
            <span className="badge-glow rounded-full px-2 py-0.5 text-[11px] font-semibold text-heading">
              {p.badge}
            </span>
          ) : null}
          {flag ? (
            <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-[11px] font-semibold text-error-text">
              {flag}
            </span>
          ) : null}
          {p.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-foreground"
            >
              {t}
            </span>
          ))}
          {p.description ? (
            <span className="hidden min-w-0 flex-1 truncate text-[13px] text-muted-foreground sm:block">
              {p.description}
            </span>
          ) : null}
        </div>
      </div>
      <div className="text-right">
        <PriceTag price={p.price} original={p.original} unit={p.unit} size="sm" />
      </div>
      {/* no celular a linha toda é o botão: o rótulo "Comprar" só aparece a partir de sm */}
      <span aria-hidden="true" className="hidden sm:block">
        <span className={buttonVariants({ variant: "gradient-outline", size: "sm" })}>{cta}</span>
      </span>
    </div>
  );
}
