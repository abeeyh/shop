import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = { label: string; value: ReactNode; hint?: ReactNode; href?: string; alert?: boolean };

// RF-20 (doc 17): número da visão geral; com link, o cartão inteiro leva à lista
export function StatCard({ label, value, hint, href, alert }: Props) {
  const body = (
    <>
      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className={cn("font-heading text-3xl font-bold text-heading", alert && "text-gold")}>
        {value}
      </span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </>
  );
  const cls = "flex flex-col gap-1 rounded-lg border border-border bg-card p-4";
  return href ? (
    <Link
      href={href}
      className={cn(
        cls,
        "transition-colors hover:border-link/40 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
