import Link from "next/link";
import { buttonVariants } from "@/components/atoms/Button";

type Props = {
  page: number;
  pages: number;
  href: (page: number) => string;
  labels: { nav: string; prev: string; next: string };
};

// Paginação por link (página na URL — o servidor busca só ela)
export function Pagination({ page, pages, href, labels }: Props) {
  if (pages <= 1) return null;
  const link = buttonVariants({ variant: "ghost", size: "sm" });
  return (
    <nav aria-label={labels.nav} className="mt-8 flex items-center justify-center gap-3">
      {page > 1 ? (
        <Link href={href(page - 1)} className={link}>
          {labels.prev}
        </Link>
      ) : null}
      <span className="text-sm text-muted-foreground">
        {page} / {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className={link}>
          {labels.next}
        </Link>
      ) : null}
    </nav>
  );
}
