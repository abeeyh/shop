"use client";

import { useActionState, useEffect, useRef } from "react";
import { buttonVariants } from "@/components/atoms/Button";
import { Textarea } from "@/components/atoms/Input";
import type { ChatState } from "../chat-actions";
import { useChat } from "./useChat";

type Labels = {
  you: string;
  team: string;
  placeholder: string;
  send: string;
  errors: Record<string, string>;
};

// Lista de mensagens + envio. O lado (cliente ou equipe) muda só o rótulo e a action.
export function ChatThread({
  conversationId,
  viewer,
  action,
  hidden,
  draft,
  labels,
}: {
  conversationId: string;
  viewer: "customer" | "staff";
  action: (prev: ChatState, form: FormData) => Promise<ChatState>;
  hidden?: Record<string, string>;
  draft?: string; // texto inicial do campo (mensagem pronta)
  labels: Labels;
}) {
  const { messages } = useChat(conversationId);
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  const end = useRef<HTMLLIElement>(null);
  useEffect(() => {
    // corpo em bloco: no Chrome novo scrollIntoView devolve Promise, e o React a chamaria como cleanup
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  return (
    <div className="grid gap-3">
      <ol aria-live="polite" className="grid max-h-80 gap-2 overflow-y-auto pr-1 text-sm">
        {messages.map((m) => {
          const mine = m.authorType === viewer;
          return (
            <li key={m.id} className={`grid gap-0.5 ${mine ? "justify-items-end" : "justify-items-start"}`}>
              <span className="text-xs text-muted-foreground">{mine ? labels.you : labels.team}</span>
              <p
                className={`max-w-[85%] rounded-md px-3 py-2 whitespace-pre-line ${mine ? "bg-primary text-primary-foreground" : "bg-muted text-heading"}`}
              >
                {m.body}
              </p>
            </li>
          );
        })}
        <li ref={end} aria-hidden="true" />
      </ol>
      <form action={formAction} className="grid gap-2">
        {Object.entries(hidden ?? {}).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <label className="sr-only" htmlFor={`chat-body-${viewer}`}>
          {labels.placeholder}
        </label>
        <Textarea
          id={`chat-body-${viewer}`}
          name="body"
          required
          maxLength={2000}
          defaultValue={draft}
          placeholder={labels.placeholder}
          className="min-h-16"
        />
        <button
          type="submit"
          disabled={pending}
          className={buttonVariants({ variant: "primary", size: "sm" })}
        >
          {labels.send}
        </button>
        {state.status !== "idle" && state.status !== "ok" ? (
          <p role="alert" className="text-sm text-error-text">
            {labels.errors[state.status]}
          </p>
        ) : null}
      </form>
    </div>
  );
}
