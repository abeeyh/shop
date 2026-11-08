"use client";

import { useActionState } from "react";
import { buttonVariants } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { PASSWORD_MAX, PASSWORD_MIN, PASSWORD_PATTERN } from "@/lib/password";
import { deleteAccount, saveCharacter, signInCustomer, signUp, type AccountState } from "../actions";

const initial: AccountState = { error: "" };
type Errors = Partial<Record<Exclude<AccountState["error"], "">, string>>;

const field = "grid gap-1.5 text-sm";
const label = "font-semibold text-foreground";

function ErrorLine({ state, errors }: { state: AccountState; errors: Errors }) {
  return (
    <p role="alert" className="min-h-5 text-sm text-error-text">
      {state.error ? errors[state.error] : null}
    </p>
  );
}

function EmailPassword(p: { email: string; password: string; hint?: string; newPassword?: boolean }) {
  return (
    <>
      <label className={field}>
        <span className={label}>{p.email}</span>
        <Input name="email" type="email" required maxLength={254} autoComplete="email" />
      </label>
      <label className={field}>
        <span className={label}>{p.password}</span>
        <Input
          name="password"
          type="password"
          required
          minLength={p.newPassword ? PASSWORD_MIN : 1}
          maxLength={PASSWORD_MAX}
          pattern={p.newPassword ? PASSWORD_PATTERN : undefined}
          autoComplete={p.newPassword ? "new-password" : "current-password"}
          aria-describedby={p.hint ? "hint-password" : undefined}
        />
        {p.hint ? (
          <span id="hint-password" className="text-xs text-muted-foreground">
            {p.hint}
          </span>
        ) : null}
      </label>
    </>
  );
}

type AuthLabels = { email: string; password: string; submit: string; hint?: string };

// RN-107: cadastro opcional (compra continua sem conta — RN-01). #130: `next` = página para voltar
export function SignUpForm(p: { locale: string; next?: string; labels: AuthLabels; errors: Errors }) {
  const [state, action, pending] = useActionState(signUp, initial);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="locale" value={p.locale} />
      {p.next ? <input type="hidden" name="next" value={p.next} /> : null}
      <EmailPassword {...p.labels} newPassword />
      <button type="submit" disabled={pending} className={buttonVariants({ variant: "primary", size: "lg" })}>
        {p.labels.submit}
      </button>
      <ErrorLine state={state} errors={p.errors} />
    </form>
  );
}

export function CustomerLoginForm(p: { locale: string; next?: string; labels: AuthLabels; errors: Errors }) {
  const [state, action, pending] = useActionState(signInCustomer, initial);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="locale" value={p.locale} />
      {p.next ? <input type="hidden" name="next" value={p.next} /> : null}
      <EmailPassword {...p.labels} />
      <button type="submit" disabled={pending} className={buttonVariants({ variant: "primary", size: "lg" })}>
        {p.labels.submit}
      </button>
      <ErrorLine state={state} errors={p.errors} />
    </form>
  );
}

// RN-108: personagem salvo (realm, facção, nome — mesmas regras da compra, RN-15)
export function CharacterForm(p: {
  labels: { realm: string; faction: string; alliance: string; horde: string; name: string; add: string };
  errors: Errors;
}) {
  const [state, action, pending] = useActionState(saveCharacter, initial);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_10rem_1fr_auto] sm:items-end">
      <label className={field}>
        <span className={label}>{p.labels.realm}</span>
        <Input name="realm" required minLength={2} maxLength={40} />
      </label>
      <label className={field}>
        <span className={label}>{p.labels.faction}</span>
        <Select name="faction" defaultValue="alliance">
          <option value="alliance">{p.labels.alliance}</option>
          <option value="horde">{p.labels.horde}</option>
        </Select>
      </label>
      <label className={field}>
        <span className={label}>{p.labels.name}</span>
        <Input name="name" required minLength={2} maxLength={12} autoComplete="off" />
      </label>
      <button type="submit" disabled={pending} className={buttonVariants({ variant: "gradient-outline" })}>
        {p.labels.add}
      </button>
      <div className="sm:col-span-4">
        <ErrorLine state={state} errors={p.errors} />
      </div>
    </form>
  );
}

// RN-109: excluir a conta pede a senha de novo
export function DeleteAccountForm(p: {
  locale: string;
  labels: { password: string; submit: string };
  errors: Errors;
}) {
  const [state, action, pending] = useActionState(deleteAccount, initial);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
      <input type="hidden" name="locale" value={p.locale} />
      <label className={field}>
        <span className={label}>{p.labels.password}</span>
        <Input name="password" type="password" required maxLength={200} autoComplete="current-password" />
      </label>
      <button type="submit" disabled={pending} className={buttonVariants({ variant: "destructive" })}>
        {p.labels.submit}
      </button>
      <div className="sm:col-span-2">
        <ErrorLine state={state} errors={p.errors} />
      </div>
    </form>
  );
}
