"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  summary: ReactNode;
  children: ReactNode;
  openFrom?: string; // media query em que começa aberto (padrão: desktop, lg)
  className?: string;
};

// Expandir/recolher com <details> nativo: funciona sem JS, teclado e leitor de tela já sabem usar.
// Começa fechado (celular: conteúdo principal primeiro); no desktop abre ao montar.
export function Collapsible({ summary, children, openFrom = "(min-width: 1024px)", className }: Props) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (ref.current && window.matchMedia(openFrom).matches) ref.current.open = true;
  }, [openFrom]);
  return (
    <details ref={ref} className={cn("group", className)}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-sm font-heading text-base font-bold text-heading focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        {summary}
        <ChevronDown
          aria-hidden="true"
          className="size-5 transition-transform group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      {children}
    </details>
  );
}
