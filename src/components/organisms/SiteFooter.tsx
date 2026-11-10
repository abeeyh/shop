import Link from "next/link";
import type { ReactNode } from "react";

type Column = { title: string; links: { href: string; label: string }[] };

type SiteFooterProps = {
  about: string;
  columns: Column[];
  copyright: string;
  extra?: ReactNode;
  credits?: ReactNode; // licenças de arte de terceiros (CC BY pede crédito)
};

export function SiteFooter({ about, columns, copyright, extra, credits }: SiteFooterProps) {
  return (
    <footer className="mt-16 border-t border-border bg-background py-12">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-5">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <p className="text-sm text-muted-foreground">{about}</p>
          {columns.map((col) => (
            <div key={col.title}>
              <h2 className="mb-3 font-heading text-base font-semibold text-heading">{col.title}</h2>
              <ul className="grid gap-2">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link href={l.href} className="text-sm text-foreground hover:text-heading">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
          <p className="text-[13px] text-muted-foreground">{copyright}</p>
          {extra}
        </div>
        {credits ? <p className="mt-3 text-xs text-muted-foreground">{credits}</p> : null}
      </div>
    </footer>
  );
}
