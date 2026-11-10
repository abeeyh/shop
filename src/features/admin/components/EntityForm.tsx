"use client";

import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import { buttonVariants } from "@/components/atoms/Button";
import type { SaveState } from "../actions";

type Props = {
  action: (prev: SaveState, form: FormData) => Promise<SaveState>;
  locale: string;
  id?: string;
  submit: string;
  saved: string;
  errors: Record<string, string>; // mensagem por campo, já traduzida no servidor
  main: ReactNode; // coluna principal (seções de conteúdo)
  aside?: ReactNode; // coluna lateral (exibição, status)
  cancel: { href: string; label: string };
};

// Formulário do admin (doc 11 §8): 2 colunas no desktop, 1 no celular, barra de salvar fixa no rodapé.
// Os campos vêm do servidor; o servidor valida tudo (docs/04)
export function EntityForm({ action, locale, id, submit, saved, errors, main, aside, cancel }: Props) {
  const [state, formAction, pending] = useActionState(action, { status: "idle", fields: [] });
  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={id ?? ""} />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-5">{main}</div>
        {aside ? <div className="grid gap-5">{aside}</div> : null}
      </div>
      <div className="sticky bottom-0 z-10 -mx-4 grid gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        {state.status === "error" ? (
          <ul role="alert" className="grid gap-1 text-sm text-error-text">
            {state.fields.map((f) => (
              <li key={f}>{errors[f] ?? errors.generic}</li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className={buttonVariants({ variant: "primary" })}>
            {submit}
          </button>
          <Link href={cancel.href} className={buttonVariants({ variant: "ghost" })}>
            {cancel.label}
          </Link>
          <p role="status" className="text-sm text-success">
            {state.status === "ok" ? saved : null}
          </p>
        </div>
      </div>
    </form>
  );
}
