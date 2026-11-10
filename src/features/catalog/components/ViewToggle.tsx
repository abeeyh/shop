"use client";

import { LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import { Tooltip } from "@/components/atoms/Tooltip";

type View = "lista" | "grade";
type Props = {
  view: View;
  hrefs: Record<View, string>;
  labels: { group: string } & Record<View, string>;
};

const ICON = { lista: List, grade: LayoutGrid };

// #166: lista ou grade. O link leva ?vista= (dá para compartilhar) e o cookie lembra a escolha nas outras páginas
export function ViewToggle({ view, hrefs, labels }: Props) {
  return (
    <div role="group" aria-label={labels.group} className="flex gap-1 rounded-full border border-border p-1">
      {(["lista", "grade"] as const).map((v) => {
        const Icon = ICON[v];
        return (
          <Tooltip key={v} label={labels[v]}>
            <Link
              href={hrefs[v]}
              scroll={false}
              aria-label={labels[v]}
              aria-current={view === v ? "true" : undefined}
              onClick={() => {
                document.cookie = `vista=${v}; path=/; max-age=31536000; samesite=lax`;
              }}
              className="grid size-11 place-items-center rounded-full text-muted-foreground transition-colors hover:text-heading focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-[current=true]:bg-accent aria-[current=true]:text-heading"
            >
              <Icon aria-hidden="true" className="size-5" />
            </Link>
          </Tooltip>
        );
      })}
    </div>
  );
}
