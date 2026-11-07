"use client";

import { useActionState } from "react";
import { buttonVariants } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { applyCoupon, removeCoupon, type CouponFormState } from "../actions";

type Props = {
  current: string | null; // cupom guardado no carrinho (o servidor decide se vale — RN-26)
  labels: { code: string; apply: string; remove: string; invalid: string };
};

// RN-25/RN-28: o cliente só envia o código; validação, limite e mensagem genérica no servidor
export function CouponForm({ current, labels }: Props) {
  const [state, action, pending] = useActionState<CouponFormState, FormData>(applyCoupon, { status: "idle" });
  if (current) {
    return (
      <form action={removeCoupon} className="flex items-center justify-between gap-3 text-sm">
        <span className="font-mono text-heading uppercase">{current}</span>
        <button type="submit" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          {labels.remove}
        </button>
      </form>
    );
  }
  return (
    <form action={action} className="grid gap-2">
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="coupon-code">
          {labels.code}
        </label>
        <Input
          id="coupon-code"
          name="code"
          placeholder={labels.code}
          maxLength={40}
          autoComplete="off"
          aria-invalid={state.status === "error"}
        />
        <button type="submit" disabled={pending} className={buttonVariants({ variant: "ghost" })}>
          {labels.apply}
        </button>
      </div>
      <p aria-live="polite" className="min-h-5 text-sm text-error-text">
        {state.status === "error" ? labels.invalid : null}
      </p>
    </form>
  );
}
