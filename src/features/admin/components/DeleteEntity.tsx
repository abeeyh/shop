"use client";

import { useActionState } from "react";
import { ConfirmSubmit } from "@/components/molecules/ConfirmSubmit";
import { deleteEntity, type SaveState } from "../actions";

type Props = {
  entity: "category" | "tag" | "product" | "promotion" | "coupon";
  id: string;
  locale: string;
  labels: {
    delete: string;
    title: string;
    message: string;
    confirm: string;
    cancel: string;
    inUse: string;
    generic: string;
  };
};

// Doc 17 §3 + RN-72: excluir pede confirmação; o que já foi usado não sai — a mensagem manda desativar
export function DeleteEntity({ entity, id, locale, labels }: Props) {
  const [state, action, pending] = useActionState<SaveState, FormData>(deleteEntity, {
    status: "idle",
    fields: [],
  });
  return (
    <form action={action} className="grid gap-2 border-t border-border pt-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="entity" value={entity} />
      <div>
        <ConfirmSubmit
          danger
          label={labels.delete}
          title={labels.title}
          message={labels.message}
          confirmLabel={labels.confirm}
          cancelLabel={labels.cancel}
          disabled={pending}
        />
      </div>
      {state.status === "error" ? (
        <p role="alert" className="text-sm text-error-text">
          {state.fields.includes("inUse") ? labels.inUse : labels.generic}
        </p>
      ) : null}
    </form>
  );
}
