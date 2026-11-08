"use client";

import { MessageCircle, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useActionState, useEffect, useState } from "react";
import { buttonVariants } from "@/components/atoms/Button";
import { Input, Textarea } from "@/components/atoms/Input";
import { LocalTime } from "@/components/molecules/LocalTime";
import { sendChatMessage, startChat, type ChatState } from "../chat-actions";
import { CHAT_OPEN_EVENT, type ChatOpenDetail } from "./ChatOpenButton";
import { Skeleton } from "@/components/atoms/Skeleton";

// #88: lazy loading — conversa (EventSource, polling, máscara de envio) só baixa ao abrir o chat
const ChatThread = dynamic(() => import("./ChatThread").then((m) => m.ChatThread), {
  loading: () => <Skeleton className="h-64 w-full" />,
});

type Labels = {
  open: string;
  close: string;
  title: string;
  notice: string; // RN-95: aviso fixo de credenciais
  email: string;
  name: string;
  message: string;
  start: string;
  offlineTitle: string;
  offlineStart: string;
  backAt: string;
  you: string;
  team: string;
  placeholder: string;
  send: string;
  errors: Record<string, string>;
};

// RN-92: botão de chat em todas as páginas da loja
export function ChatWidget({
  locale,
  timeLocale,
  initialId,
  online,
  backAt,
  timeZone,
  labels,
}: {
  locale: string;
  timeLocale: string; // BCP 47 para o horário de volta
  initialId: string | null;
  online: boolean;
  backAt: string | null;
  timeZone: string | null;
  labels: Labels;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(""); // mensagem pronta vinda de "consultar preço"/"agendar run"
  useEffect(() => {
    const onOpen = (e: Event) => {
      setDraft((e as CustomEvent<ChatOpenDetail>).detail.message);
      setOpen(true);
    };
    window.addEventListener(CHAT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(CHAT_OPEN_EVENT, onOpen);
  }, []);
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
          {!online && !id ? (
            // RN-99: fora do horário vira formulário offline e diz quando volta (no fuso do cliente)
            <p data-testid="chat-offline" className="text-sm text-heading">
              {labels.offlineTitle}
              {backAt ? (
                <>
                  {" "}
                  {labels.backAt} <LocalTime iso={backAt} locale={timeLocale} timeZone={timeZone} />
                </>
              ) : null}
            </p>
          ) : null}
          {id ? (
            <ChatThread
              key={draft}
              conversationId={id}
              viewer="customer"
              draft={draft}
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
                <Textarea
                  key={draft}
                  name="body"
                  required
                  maxLength={2000}
                  defaultValue={draft}
                  className="min-h-20"
                />
              </label>
              <button type="submit" disabled={pending} className={buttonVariants({ variant: "primary" })}>
                {online ? labels.start : labels.offlineStart}
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
