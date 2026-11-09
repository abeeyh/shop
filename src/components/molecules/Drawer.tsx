"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

type Props = { children: ReactNode; title: string; closeLabel: string; onClose: () => void; wide?: boolean };

// Barra lateral sobre a página (#109: carrinho depois de adicionar). <dialog> nativo: foco preso, Esc
// fecha, fundo inerte; clique no fundo escurecido também fecha. Quem usa monta só quando está aberta.
export function Drawer({ children, title, closeLabel, onClose, wide }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        // o alvo é o <dialog> tanto no fundo quanto na área vazia dentro dele: decide pela posição
        const r = e.currentTarget.getBoundingClientRect();
        const outside =
          e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
        if (e.target === e.currentTarget && outside) ref.current?.close();
      }}
      className={`drawer m-0 ml-auto h-dvh max-h-dvh w-full ${wide ? "max-w-[44rem]" : "max-w-[26rem]"} overflow-y-auto border-l border-border bg-popover p-0 text-foreground backdrop:bg-background/70 backdrop:backdrop-blur-sm max-sm:mt-auto max-sm:h-auto max-sm:max-h-[92dvh] max-sm:max-w-none max-sm:rounded-t-2xl max-sm:border-t max-sm:border-l-0`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-popover/90 px-5 pt-4 pb-2 backdrop-blur">
        <h2 className="font-heading text-lg font-bold text-heading">{title}</h2>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label={closeLabel}
          className="grid size-11 place-items-center rounded-full border border-border text-heading hover:bg-accent"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>
      <div className="px-5 pb-8">{children}</div>
    </dialog>
  );
}
