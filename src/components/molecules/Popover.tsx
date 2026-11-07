"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = { label: string; icon: ReactNode; children: ReactNode; className?: string };

// #102: painel pequeno que abre por um botão (<details> nativo: teclado e leitor de tela de graça);
// fecha com Esc e com clique fora. Aberto/fechado fica no estado do React: um refresh do servidor (ex.: fuso
// detectado na 1ª visita) não fecha o painel no meio do uso
export function Popover({ label, icon, children, className }: Props) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const close = (e: Event) => {
      const el = ref.current;
      if (!el?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !el.contains(e.target as Node)) {
        setOpen(false);
        if (e instanceof KeyboardEvent) el.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);
  return (
    <details
      ref={ref}
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className={cn("relative", className)}
    >
      <summary
        aria-label={label}
        className="grid size-11 cursor-pointer list-none place-items-center rounded-full border border-border text-heading hover:bg-accent [&::-webkit-details-marker]:hidden"
      >
        {icon}
      </summary>
      <div className="absolute right-0 z-50 mt-2 w-72 rounded-lg border border-border bg-popover p-4 shadow-2xl shadow-black/50">
        {children}
      </div>
    </details>
  );
}
