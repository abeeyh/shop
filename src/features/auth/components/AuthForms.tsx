"use client";

import { useActionState } from "react";
import { buttonVariants } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { signIn, startTwoFactor, verifyCode, type AuthState } from "../actions";

const initial: AuthState = { error: "" };
type Errors = { invalid: string; limited: string };

function ErrorLine({ state, errors }: { state: AuthState; errors: Errors }) {
  return (
    <p role="alert" className="min-h-5 text-sm text-error-text">
      {state.error ? errors[state.error] : null}
    </p>
  );
}

const field = "grid gap-1.5 text-sm";
const label = "font-semibold text-foreground";

export function LoginForm(p: {
  locale: string;
  labels: { email: string; password: string; submit: string };
  errors: Errors;
}) {
  const [state, action, pending] = useActionState(signIn, initial);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="locale" value={p.locale} />
      <label className={field}>
        <span className={label}>{p.labels.email}</span>
        <Input name="email" type="email" required autoComplete="username" />
      </label>
      <label className={field}>
        <span className={label}>{p.labels.password}</span>
        <Input name="password" type="password" required autoComplete="current-password" />
      </label>
      <button type="submit" disabled={pending} className={buttonVariants({ variant: "primary" })}>
        {p.labels.submit}
      </button>
      <ErrorLine state={state} errors={p.errors} />
    </form>
  );
}

export function CodeForm(p: { locale: string; labels: { code: string; submit: string }; errors: Errors }) {
  const [state, action, pending] = useActionState(verifyCode, initial);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="locale" value={p.locale} />
      <label className={field}>
        <span className={label}>{p.labels.code}</span>
        <Input
          name="code"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          required
          autoComplete="one-time-code"
        />
      </label>
      <button type="submit" disabled={pending} className={buttonVariants({ variant: "primary" })}>
        {p.labels.submit}
      </button>
      <ErrorLine state={state} errors={p.errors} />
    </form>
  );
}

type SetupLabels = {
  password: string;
  start: string;
  secret: string;
  backupCodes: string;
  code: string;
  confirm: string;
};

// RN-02: ativa o 2FA — senha → segredo (digitado no app autenticador) → primeiro código confirma
export function TwoFactorSetup(p: { locale: string; labels: SetupLabels; errors: Errors }) {
  const [state, action, pending] = useActionState(startTwoFactor, initial);
  if (!state.totpUri) {
    return (
      <form action={action} className="grid gap-4">
        <label className={field}>
          <span className={label}>{p.labels.password}</span>
          <Input name="password" type="password" required autoComplete="current-password" />
        </label>
        <button type="submit" disabled={pending} className={buttonVariants({ variant: "primary" })}>
          {p.labels.start}
        </button>
        <ErrorLine state={state} errors={p.errors} />
      </form>
    );
  }
  const secret = new URL(state.totpUri).searchParams.get("secret") ?? "";
  return (
    <div className="grid gap-5">
      <div className="grid gap-1.5 text-sm">
        <span className={label}>{p.labels.secret}</span>
        <code data-testid="totp-secret" className="rounded-sm bg-input px-3 py-2 break-all text-heading">
          {secret}
        </code>
      </div>
      <div className="grid gap-1.5 text-sm">
        <span className={label}>{p.labels.backupCodes}</span>
        <ul className="grid grid-cols-2 gap-1 font-mono text-heading">
          {state.backupCodes?.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
      <CodeForm
        locale={p.locale}
        labels={{ code: p.labels.code, submit: p.labels.confirm }}
        errors={p.errors}
      />
    </div>
  );
}
