import type { ReactNode } from "react";

// Doc 11 §8 / RF-08: tabela no desktop, cartões no celular (cada <td> leva data-label com o nome da coluna)
const TABLE =
  "w-full text-left text-sm [&_th]:px-3 [&_th]:py-2 [&_th]:font-medium [&_th]:text-muted-foreground " +
  "md:[&_td]:border-t md:[&_td]:border-border md:[&_td]:px-3 md:[&_td]:py-2.5 " +
  "max-md:block max-md:[&_thead]:sr-only max-md:[&_tbody]:grid max-md:[&_tbody]:gap-3 max-md:[&_tbody]:p-3 " +
  "max-md:[&_tr]:grid max-md:[&_tr]:gap-1 max-md:[&_tr]:rounded-lg max-md:[&_tr]:border max-md:[&_tr]:border-border max-md:[&_tr]:bg-background/50 max-md:[&_tr]:p-3 " +
  "max-md:[&_td]:flex max-md:[&_td]:items-center max-md:[&_td]:justify-between max-md:[&_td]:gap-3 max-md:[&_td]:py-1 " +
  "max-md:[&_td]:before:shrink-0 max-md:[&_td]:before:text-xs max-md:[&_td]:before:text-muted-foreground max-md:[&_td]:before:content-[attr(data-label)]";

export function ListTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border md:bg-card">
      <table className={TABLE}>{children}</table>
    </div>
  );
}
