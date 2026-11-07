import Link from "next/link";
import type { ReactNode } from "react";

type NavItem = { href: string; label: string };

type SiteHeaderProps = {
  homeHref: string;
  nav: NavItem[];
  navLabel: string;
  tools?: ReactNode; // seletores de região/idioma/fuso, carrinho (#13, #14, #17)
};

// docs/15 §3 item 1: logo, menu de categorias e ferramentas à direita
export function SiteHeader({ homeHref, nav, navLabel, tools }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex min-h-18 w-full max-w-[1350px] items-center gap-4 px-4 sm:px-5">
        <Link
          href={homeHref}
          className="flex items-center gap-2.5 font-heading text-xl font-bold text-heading"
        >
          <span
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-md bg-linear-[116.85deg] from-gradient-from to-gradient-to text-base text-white"
          >
            S
          </span>
          Shop
        </Link>
        <nav aria-label={navLabel} className="hidden gap-1 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-2 font-heading text-sm font-semibold text-foreground hover:bg-accent hover:text-heading"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">{tools}</div>
      </div>
    </header>
  );
}
