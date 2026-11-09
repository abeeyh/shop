"use client";

import { useActionState, useState } from "react";
import { buttonVariants } from "@/components/atoms/Button";
import { placeOrder, type CheckoutState } from "../actions";

type Props = {
  locale: string;
  defaultEmail?: string; // RN-107: e-mail da conta logada (o cliente pode trocar)
  disabled: boolean;
  maintenance: boolean; // #146: pagamento em manutenção (o servidor também recusa)
  expectedTotal: number; // total mostrado; o servidor recalcula e só compara (RN-20)
  labels: {
    email: string;
    emailHint: string;
    network: string;
    networkWarning: string;
    pay: string;
    method: string;
    crypto: string;
    card: string;
    payCard: string;
    cardNotImplemented: string;
    maintenance: string;
    errors: Record<string, string>;
  };
};

const input =
  "min-h-11 w-full rounded-sm border border-border bg-input px-3.5 text-heading placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-invalid:border-error-text";
const choice =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border bg-input px-4 font-semibold text-heading has-[:checked]:border-primary has-[:checked]:bg-primary/10";

// RN-01: visitante paga só com e-mail; RN-37: rede escolhida em destaque (rede errada = perda)
export function CheckoutForm({ locale, defaultEmail, disabled, maintenance, expectedTotal, labels }: Props) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrder, { error: "" });
  // RN-35 (#120): cripto (USDT) ou cartão; o cartão ainda não tem provedor (#25)
  const [method, setMethod] = useState<"usdt" | "card">("usdt");
  return (
    <form action={action} className="grid gap-4 border-t border-border pt-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="expectedTotal" value={expectedTotal} />
      {maintenance ? (
        <p role="status" className="rounded-md border border-gold/40 bg-gold/10 p-3 text-sm text-heading">
          {labels.maintenance}
        </p>
      ) : null}
      <label className="grid gap-1.5 text-sm">
        <span className="font-semibold text-foreground">{labels.email}</span>
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          defaultValue={defaultEmail}
          className={input}
          aria-invalid={state.error === "email"}
          aria-describedby="hint-email"
        />
        <span id="hint-email" className="text-xs text-muted-foreground">
          {labels.emailHint}
        </span>
      </label>
      <fieldset className="grid gap-1.5 text-sm">
        <legend className="mb-1.5 font-semibold text-foreground">{labels.method}</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["usdt", "card"] as const).map((m) => (
            <label key={m} className={choice}>
              <input
                type="radio"
                name="method"
                value={m}
                checked={method === m}
                onChange={() => setMethod(m)}
                className="size-4.5 accent-primary"
              />
              {m === "usdt" ? labels.crypto : labels.card}
            </label>
          ))}
        </div>
      </fieldset>
      {method === "card" ? (
        <p role="status" className="rounded-md border border-border bg-secondary p-3 text-sm">
          {labels.cardNotImplemented}
        </p>
      ) : null}
      <fieldset className="grid gap-1.5 text-sm" hidden={method === "card"}>
        <legend className="mb-1.5 font-semibold text-foreground">{labels.network}</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className={choice}>
            <input
              type="radio"
              name="network"
              value="trc20"
              defaultChecked
              className="size-4.5 accent-primary"
            />
            TRC-20
          </label>
          <label className={choice}>
            <input type="radio" name="network" value="erc20" className="size-4.5 accent-primary" />
            ERC-20
          </label>
        </div>
        <span className="text-xs text-muted-foreground">{labels.networkWarning}</span>
      </fieldset>
      <button
        type="submit"
        disabled={disabled || maintenance || pending || method === "card"}
        className={buttonVariants({ variant: "primary", size: "lg" })}
      >
        {method === "card" ? labels.payCard : labels.pay}
      </button>
      <p role="alert" className="min-h-5 text-center text-sm text-error-text">
        {state.error ? labels.errors[state.error] : null}
      </p>
    </form>
  );
}
