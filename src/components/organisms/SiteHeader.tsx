import Link from "next/link";
import type { ReactNode } from "react";

type SiteHeaderProps = {
  homeHref: string;
  tools?: ReactNode; // idioma/fuso, conta e carrinho
  search?: ReactNode; // RN-100: busca de produtos
  mobileSearch?: ReactNode; // mesma busca, numa linha própria no celular
  tabs?: ReactNode; // abas das categorias
};

// #102: uma linha (logo · busca · ferramentas) + abas das categorias logo abaixo — tudo a 1 clique
export function SiteHeader({ homeHref, tools, search, mobileSearch, tabs }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/75 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-5">
        <div className="flex min-h-16 items-center gap-3">
          <Link
            href={homeHref}
            className="mr-auto flex items-center gap-2.5 font-heading text-lg font-bold text-heading md:mr-0"
          >
            <span
              aria-hidden="true"
              className="grid size-8 place-items-center rounded-md bg-linear-[135deg] from-gradient-from to-gradient-to text-sm text-primary-foreground shadow-[0_0_24px_-4px_var(--gradient-from)]"
            >
              S
            </span>
            Shop
          </Link>
          {search ? <div className="mx-auto hidden w-full max-w-md md:block">{search}</div> : null}
          <div className="flex items-center gap-2">{tools}</div>
        </div>
        {mobileSearch ? <div className="pb-2.5 md:hidden">{mobileSearch}</div> : null}
        {tabs}
      </div>
    </header>
  );
}
