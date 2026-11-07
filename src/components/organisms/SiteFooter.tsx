import Link from "next/link";

type Column = { title: string; links: { href: string; label: string }[] };

type SiteFooterProps = { about: string; columns: Column[]; copyright: string };

export function SiteFooter({ about, columns, copyright }: SiteFooterProps) {
  return (
    <footer className="mt-16 border-t border-border bg-background py-12">
      <div className="mx-auto w-full max-w-[1350px] px-4 sm:px-5">
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
        <p className="mt-8 border-t border-border pt-5 text-[13px] text-muted-foreground">{copyright}</p>
      </div>
    </footer>
  );
}
