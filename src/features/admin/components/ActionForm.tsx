"use client";

import { useActionState, type ReactNode } from "react";
import { buttonVariants } from "@/components/atoms/Button";
import { ConfirmSubmit } from "@/components/molecules/ConfirmSubmit";
import type { SaveState } from "../actions";

type Props = {
  action: (prev: SaveState, form: FormData) => Promise<SaveState>;
  locale: string;
  id?: string;
  submit: string;
  saved: string;
  errors: Record<string, string>; // mensagem por campo, já traduzida no servidor
  children: ReactNode;
  // RF-05 (doc 17): ação que muda estado pede confirmação antes de enviar
  confirm?: { title: string; message: string; confirm: string; cancel: string };
};

// Formulário do admin: os campos vêm do servidor; o servidor valida tudo (docs/04)
export function ActionForm({ action, locale, id, submit, saved, errors, children, confirm }: Props) {
  const [state, formAction, pending] = useActionState(action, { status: "idle", fields: [] });
  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={id ?? ""} />
      {children}
      <div className="flex flex-wrap items-center gap-4">
        {confirm ? (
          <ConfirmSubmit
            label={submit}
            title={confirm.title}
            message={confirm.message}
            confirmLabel={confirm.confirm}
            cancelLabel={confirm.cancel}
            disabled={pending}
            size="md"
          />
        ) : (
          <button type="submit" disabled={pending} className={buttonVariants({ variant: "primary" })}>
            {submit}
          </button>
        )}
        <p role="status" className="text-sm">
          {state.status === "ok" ? saved : null}
        </p>
      </div>
      {state.status === "error" ? (
        <ul role="alert" className="grid gap-1 text-sm text-error-text">
          {state.fields.map((f) => (
            <li key={f}>{errors[f] ?? errors.generic}</li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
