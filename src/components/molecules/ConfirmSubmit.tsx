"use client";

import { useId, useRef } from "react";
import { buttonVariants } from "@/components/atoms/Button";

type Props = {
  label: string; // texto do botão que abre a confirmação
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  name?: string; // vai junto no envio (ex.: intent=delete)
  value?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  ariaLabel?: string; // lista com várias linhas: o botão diz a qual item se refere
};

// RF-05 (doc 17): ação que muda estado pede confirmação. Fica DENTRO do <form>: o botão de confirmar
// é o submit do próprio formulário. <dialog> nativo: foco preso, Esc cancela, fundo inerte.
export function ConfirmSubmit(p: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId(); // vários na mesma página (uma linha por item)
  const tone = p.danger ? "destructive" : "primary";
  return (
    <>
      <button
        type="button"
        disabled={p.disabled}
        aria-label={p.ariaLabel}
        onClick={(e) => {
          // campo obrigatório inválido: mostra o erro no próprio campo em vez de abrir o diálogo por cima
          if (e.currentTarget.form?.reportValidity() === false) return;
          ref.current?.showModal();
        }}
        className={buttonVariants({ variant: p.danger ? "ghost" : "primary", size: p.size ?? "sm" })}
      >
        {p.label}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        className="m-auto w-[min(26rem,calc(100%-2rem))] rounded-lg border border-border bg-popover p-5 text-foreground backdrop:bg-background/70 backdrop:backdrop-blur-sm"
      >
        <h2 id={titleId} className="font-heading text-lg font-bold text-heading">
          {p.title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{p.message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            autoFocus // o padrão é desistir: Enter não confirma sem querer
            onClick={() => ref.current?.close()}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            {p.cancelLabel}
          </button>
          <button
            type="submit"
            name={p.name}
            value={p.value}
            onClick={() => ref.current?.close()}
            className={buttonVariants({ variant: tone, size: "sm" })}
          >
            {p.confirmLabel}
          </button>
        </div>
      </dialog>
    </>
  );
}
