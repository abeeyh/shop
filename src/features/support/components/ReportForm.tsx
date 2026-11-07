"use client";

import { useActionState } from "react";
import { buttonVariants } from "@/components/atoms/Button";
import { Input, Textarea } from "@/components/atoms/Input";
import { submitReport, type ReportState } from "../actions";

type Props = {
  locale: string;
  page: string;
  errorId: string;
  labels: {
    description: string;
    email: string;
    emailHint: string;
    submit: string;
    sent: string;
    invalid: string;
    limited: string;
  };
};

// RN-91: o usuário só escreve; o resto do contexto o servidor coleta
export function ReportForm({ locale, page, errorId, labels }: Props) {
  const [state, action, pending] = useActionState<ReportState, FormData>(submitReport, {
    status: "idle",
    fields: [],
  });
  if (state.status === "ok")
    return (
      <p role="status" className="text-heading">
        {labels.sent}
      </p>
    );
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="page" value={page} />
      <input type="hidden" name="errorId" value={errorId} />
      {/* campo invisível contra robôs (não é lido por leitor de tela nem recebe foco) */}
      <input
        type="text"
        name="website"
        defaultValue=""
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      <label className="grid gap-1.5 text-sm">
        <span className="font-semibold text-foreground">{labels.description}</span>
        <Textarea
          name="description"
          required
          minLength={10}
          maxLength={2000}
          aria-invalid={state.fields.includes("description")}
        />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-semibold text-foreground">{labels.email}</span>
        <Input
          name="email"
          type="email"
          maxLength={254}
          autoComplete="email"
          aria-describedby="report-email-hint"
        />
        <span id="report-email-hint" className="text-xs text-muted-foreground">
          {labels.emailHint}
        </span>
      </label>
      <button type="submit" disabled={pending} className={buttonVariants({ variant: "primary" })}>
        {labels.submit}
      </button>
      <p role="alert" className="min-h-5 text-sm text-error-text">
        {state.status === "error" ? labels.invalid : state.status === "limited" ? labels.limited : null}
      </p>
    </form>
  );
}
