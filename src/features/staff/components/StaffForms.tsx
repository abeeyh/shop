"use client";

import { useActionState } from "react";
import { buttonVariants } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { PASSWORD_MAX, PASSWORD_MIN, PASSWORD_PATTERN } from "@/lib/password";
import {
  acceptStaffInvite,
  inviteStaff,
  saveStaffMember,
  type AcceptState,
  type InviteState,
  type StaffState,
} from "../actions";

const field = "grid gap-1.5 text-sm";
const label = "font-semibold text-foreground";

type Lang = { code: string; label: string };

function Languages({ langs, selected, legend }: { langs: Lang[]; selected: string[]; legend: string }) {
  return (
    <fieldset className={field}>
      <legend className={`${label} mb-1.5`}>{legend}</legend>
      <div className="flex flex-wrap gap-3">
        {langs.map((l) => (
          <label key={l.code} className="flex items-center gap-2">
            <input
              type="checkbox"
              name="languages"
              value={l.code}
              defaultChecked={selected.includes(l.code)}
              className="size-4.5 accent-primary"
            />
            {l.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

type InviteLabels = {
  email: string;
  role: string;
  admin: string;
  support: string;
  languages: string;
  submit: string;
  link: string;
  errors: Record<string, string>;
};

// RN-04: só admin convida; o link aparece uma vez (o e-mail entra com o provedor de e-mail)
export function InviteForm({
  locale,
  langs,
  labels,
}: {
  locale: string;
  langs: Lang[];
  labels: InviteLabels;
}) {
  const [state, action, pending] = useActionState<InviteState, FormData>(inviteStaff, {
    status: "idle",
    fields: [],
  });
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="locale" value={locale} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className={field}>
          <span className={label}>{labels.email}</span>
          <Input name="email" type="email" required maxLength={254} autoComplete="off" />
        </label>
        <label className={field}>
          <span className={label}>{labels.role}</span>
          <Select name="role" defaultValue="suporte">
            <option value="suporte">{labels.support}</option>
            <option value="admin">{labels.admin}</option>
          </Select>
        </label>
      </div>
      <Languages langs={langs} selected={[]} legend={labels.languages} />
      <button type="submit" disabled={pending} className={buttonVariants({ variant: "primary" })}>
        {labels.submit}
      </button>
      {state.link ? (
        <div className={field}>
          <span className={label}>{labels.link}</span>
          <code data-testid="invite-link" className="rounded-sm bg-input px-3 py-2 break-all text-heading">
            {state.link}
          </code>
        </div>
      ) : null}
      {state.status === "error" ? (
        <p role="alert" className="text-sm text-error-text">
          {labels.errors[state.fields[0] ?? "generic"] ?? labels.errors.generic}
        </p>
      ) : null}
    </form>
  );
}

type Member = {
  userId: string;
  email: string;
  role: "admin" | "suporte";
  languages: string[];
  active: boolean;
};
type MemberLabels = {
  role: string;
  admin: string;
  support: string;
  languages: string;
  active: string;
  save: string;
  saved: string;
  errors: Record<string, string>;
};

// RN-05/RN-06: papel, idiomas e ativo (desativar derruba as sessões no servidor)
export function MemberForm({
  locale,
  member,
  langs,
  labels,
}: {
  locale: string;
  member: Member;
  langs: Lang[];
  labels: MemberLabels;
}) {
  const [state, action, pending] = useActionState<StaffState, FormData>(saveStaffMember, {
    status: "idle",
    fields: [],
  });
  return (
    <form action={action} aria-label={member.email} className="grid gap-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={member.userId} />
      <div className="flex flex-wrap items-end gap-4">
        <label className={field}>
          <span className={label}>{labels.role}</span>
          <Select name="role" defaultValue={member.role}>
            <option value="suporte">{labels.support}</option>
            <option value="admin">{labels.admin}</option>
          </Select>
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-heading">
          <input
            type="checkbox"
            name="active"
            defaultChecked={member.active}
            className="size-4.5 accent-primary"
          />
          {labels.active}
        </label>
      </div>
      <Languages langs={langs} selected={member.languages} legend={labels.languages} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          {labels.save}
        </button>
        <p role="status" className="text-sm">
          {state.status === "ok" ? labels.saved : null}
        </p>
        {state.status === "error" ? (
          <p className="text-sm text-error-text">{labels.errors[state.fields[0] ?? "generic"]}</p>
        ) : null}
      </div>
    </form>
  );
}

type AcceptLabels = {
  name: string;
  password: string;
  confirm: string;
  hint: string;
  submit: string;
  errors: Record<string, string>;
};

// Aceite do convite: senha forte e fora de vazamentos (verificado no servidor)
export function AcceptForm({
  locale,
  token,
  labels,
}: {
  locale: string;
  token: string;
  labels: AcceptLabels;
}) {
  const [state, action, pending] = useActionState<AcceptState, FormData>(acceptStaffInvite, { error: "" });
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="token" value={token} />
      <label className={field}>
        <span className={label}>{labels.name}</span>
        <Input name="name" required minLength={2} maxLength={60} autoComplete="name" />
      </label>
      <label className={field}>
        <span className={label}>{labels.password}</span>
        <Input
          name="password"
          type="password"
          required
          minLength={PASSWORD_MIN}
          maxLength={PASSWORD_MAX}
          pattern={PASSWORD_PATTERN}
          autoComplete="new-password"
          aria-describedby="password-hint"
        />
        <span id="password-hint" className="text-xs text-muted-foreground">
          {labels.hint}
        </span>
      </label>
      <label className={field}>
        <span className={label}>{labels.confirm}</span>
        <Input
          name="confirm"
          type="password"
          required
          minLength={PASSWORD_MIN}
          maxLength={PASSWORD_MAX}
          autoComplete="new-password"
        />
      </label>
      <button type="submit" disabled={pending} className={buttonVariants({ variant: "primary" })}>
        {labels.submit}
      </button>
      <p role="alert" className="min-h-5 text-sm text-error-text">
        {state.error ? labels.errors[state.error] : null}
      </p>
    </form>
  );
}
