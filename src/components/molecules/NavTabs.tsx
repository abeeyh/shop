"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

type Item = { href: string; label: string };
type Props = { items: Item[]; label: string };

function Tabs({ items, label, path }: Props & { path: string | null }) {
  return (
    <nav
      aria-label={label}
      className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 pb-2.5 sm:-mx-5 sm:px-5"
    >
      {items.map((item) => {
        const current = !!path && (path === item.href || path.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className="flex min-h-9 shrink-0 items-center rounded-full px-3.5 font-heading text-sm font-semibold whitespace-nowrap text-muted-foreground transition-colors hover:bg-accent hover:text-heading aria-[current=page]:bg-accent aria-[current=page]:text-heading"
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function LiveTabs(props: Props) {
  return <Tabs {...props} path={usePathname()} />;
}

// #102: abas de categoria numa linha só (rolam de lado no celular); a aba da página atual fica marcada.
// A URL só existe na requisição: enquanto isso, as mesmas abas sem marcação (cacheComponents)
export function NavTabs(props: Props) {
  return (
    <Suspense fallback={<Tabs {...props} path={null} />}>
      <LiveTabs {...props} />
    </Suspense>
  );
}
