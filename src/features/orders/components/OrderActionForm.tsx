"use client";

import { useActionState } from "react";
import { buttonVariants } from "@/components/atoms/Button";
import { ConfirmSubmit } from "@/components/molecules/ConfirmSubmit";
import type { OrderActionState } from "../actions";

type Props = {
  action: (prev: OrderActionState, form: FormData) => Promise<OrderActionState>;
  locale: string;
  id: string;
  token: string; // link assinado do pedido (RN-01): o servidor confere de novo
  label: string;
  errors: Record<"payment" | "stale", string>;
  // RF-05 (doc 17): pedir reembolso pede confirmação
  confirm?: { title: string; message: string; confirm: string; cancel: string };
};

// #170: ações do cliente no pedido — "Pagar" e "Pedir reembolso"
export function OrderActionForm({ action, locale, id, token, label, errors, confirm }: Props) {
  const [state, formAction, pending] = useActionState<OrderActionState, FormData>(action, { error: "" });
  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="t" value={token} />
      {confirm ? (
        <ConfirmSubmit
          label={label}
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirm}
          cancelLabel={confirm.cancel}
          disabled={pending}
          size="md"
        />
      ) : (
        <button type="submit" disabled={pending} className={buttonVariants({ variant: "primary" })}>
          {label}
        </button>
      )}
      <p role="alert" className="text-sm text-error-text empty:hidden">
        {state.error ? errors[state.error] : null}
      </p>
    </form>
  );
}
