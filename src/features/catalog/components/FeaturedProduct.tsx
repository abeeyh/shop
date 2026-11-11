import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/atoms/Button";
import { PriceTag } from "@/components/molecules/PriceTag";

type Props = {
  href: string;
  name: string;
  meta: string; // categoria · tag principal
  image: { src: string; alt: string };
  price: string;
  original?: string;
  unit?: string;
  labels: { featured: string; cta: string };
};

// #164: herói da home mostra o produto de verdade (imagem, preço, 1 clique até as opções). O cartão inteiro
// é o link; "Ver opções" é só o rótulo visual (um link por produto, acessível).
export function FeaturedProduct(p: Props) {
  return (
    <article className="group relative animate-[enter_0.6s_ease-out_0.1s_both] overflow-hidden rounded-xl border border-border bg-card shadow-[0_24px_80px_-40px_var(--gradient-from)] transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-gradient-from/50">
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={p.image.src}
          alt={p.image.alt}
          fill
          priority
          sizes="(min-width: 1024px) 480px, 100vw"
          unoptimized={p.image.src.endsWith(".svg")}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute top-3 left-3 rounded-full bg-background/80 px-3 py-1 font-heading text-xs font-semibold text-heading backdrop-blur">
          {p.labels.featured}
        </span>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{p.meta}</p>
          <h2 className="font-heading text-xl font-bold text-heading">
            <Link
              href={p.href}
              className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
            >
              {p.name}
            </Link>
          </h2>
          <PriceTag price={p.price} original={p.original} unit={p.unit} size="sm" />
        </div>
        <span aria-hidden="true" className={buttonVariants({ size: "sm" })}>
          {p.labels.cta}
        </span>
      </div>
    </article>
  );
}
