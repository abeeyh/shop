"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

// #102: gaveta da compra aberta pela lista (rota interceptada). <dialog> nativo: foco preso, Esc fecha,
// fundo inerte. Fechar = voltar no histórico (a URL do produto some e a lista continua onde estava).
export function Drawer({ children, closeLabel }: { children: ReactNode; closeLabel: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={() => router.back()}
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close(); // clique no fundo escurecido
      }}
      className="drawer m-0 ml-auto h-dvh max-h-dvh w-full max-w-[30rem] overflow-y-auto border-l border-border bg-popover p-0 text-foreground backdrop:bg-black/60 backdrop:backdrop-blur-sm max-sm:mt-auto max-sm:h-auto max-sm:max-h-[92dvh] max-sm:max-w-none max-sm:rounded-t-2xl max-sm:border-t max-sm:border-l-0"
    >
      <div className="sticky top-0 z-10 flex justify-end bg-popover/90 px-4 pt-3 backdrop-blur">
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
