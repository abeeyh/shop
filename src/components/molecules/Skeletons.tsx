import type { ReactNode } from "react";
import { Skeleton } from "@/components/atoms/Skeleton";

// Região de carregamento acessível: leitor de tela ouve o texto; os blocos ficam escondidos
export function LoadingRegion({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="status" aria-live="polite" className="grid gap-6">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

// mesma grade dos cards de produto/categoria (sem pulo de layout quando o conteúdo chega)
export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-5">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="grid gap-3 rounded-lg border border-border bg-card p-5">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 8, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="grid gap-2">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export const TitleSkeleton = () => <Skeleton className="h-9 w-64 max-w-full" />;
