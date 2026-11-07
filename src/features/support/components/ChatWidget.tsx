"use client";

import { MessageCircle, X } from "lucide-react";
import { useActionState, useState } from "react";
import { buttonVariants } from "@/components/atoms/Button";
import { Input, Textarea } from "@/components/atoms/Input";
import { sendChatMessage, startChat, type ChatState } from "../chat-actions";
import { ChatThread } from "./ChatThread";

type Labels = {
  open: string;
  close: string;
  title: string;
  notice: string; // RN-95: aviso fixo de credenciais
  email: string;
  name: string;
  message: string;
  start: string;
  you: string;
  team: string;
  placeholder: string;
  send: string;
  errors: Record<string, string>;
};

// RN-92: botão de chat em todas as páginas da loja
export function ChatWidget({
  locale,
  initialId,
  labels,
}: {
  locale: string;
  initialId: string | null;
  labels: Labels;
}) {
  const [open, setOpen] = useState(false);
  const [state, startAction, pending] = useActionState<ChatState, FormData>(startChat, { status: "idle" });
  const id = state.id ?? initialId;

  return (
    <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3">
      {open ? (
        <section
          aria-label={labels.title}
          className="grid w-[min(92vw,380px)] gap-3 rounded-lg border border-border bg-card p-4 shadow-2xl"
        >
          <header className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-heading">{labels.title}</h2>
            <button
              type="button"
              aria-label={labels.close}
              onClick={() => setOpen(false)}
              className="grid size-11 place-items-center rounded-full hover:bg-accent"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </header>
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-heading">{labels.notice}</p>
          {id ? (
            <ChatThread
              conversationId={id}
              viewer="customer"
              action={sendChatMessage}
              labels={{
                you: labels.you,
                team: labels.team,
                placeholder: labels.placeholder,
                send: labels.send,
                errors: labels.errors,
              }}
            />
          ) : (
            <form action={startAction} className="grid gap-3">
              <input type="hidden" name="locale" value={locale} />
              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-foreground">{labels.email}</span>
                <Input name="email" type="email" required maxLength={254} autoComplete="email" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-foreground">{labels.name}</span>
                <Input name="name" maxLength={60} autoComplete="name" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-foreground">{labels.message}</span>
                <Textarea name="body" required maxLength={2000} className="min-h-20" />
              </label>
              <button type="submit" disabled={pending} className={buttonVariants({ variant: "primary" })}>
                {labels.start}
              </button>
              {state.status === "error" || state.status === "limited" ? (
                <p role="alert" className="text-sm text-error-text">
                  {labels.errors[state.status]}
                </p>
              ) : null}
            </form>
          )}
        </section>
      ) : null}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl hover:bg-primary-hover"
      >
        <MessageCircle aria-hidden="true" className="size-6" />
        <span className="sr-only">{labels.open}</span>
      </button>
    </div>
  );
}
