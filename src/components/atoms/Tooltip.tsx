import type { ReactNode } from "react";

// #130 (doc 11 §5): dica visual do botão de ícone, no hover E no foco por Tab (teclado). O nome
// acessível continua no aria-label do próprio botão — a dica não é lida duas vezes.
export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-full left-1/2 z-50 mt-2 -translate-x-1/2 rounded-md border border-border bg-popover px-2 py-1 text-xs font-semibold whitespace-nowrap text-heading opacity-0 shadow-lg transition-opacity group-focus-within/tip:opacity-100 group-hover/tip:opacity-100 group-has-[details[open]]/tip:hidden"
      >
        {label}
      </span>
    </span>
  );
}
