"use client";

import { MessageCircle } from "lucide-react";
import { buttonVariants } from "@/components/atoms/Button";

export const CHAT_OPEN_EVENT = "shop:chat-open";
export type ChatOpenDetail = { message: string };

// Abre o chat do suporte (RN-92) já com a mensagem escrita — "consultar preço" (RN-106) e
// "agendar a run" (RN-16). O cliente revisa e envia; nada é mandado sozinho.
export function ChatOpenButton({ label, message }: { label: string; message: string }) {
  return (
    <button
      type="button"
      onClick={() =>
        window.dispatchEvent(new CustomEvent<ChatOpenDetail>(CHAT_OPEN_EVENT, { detail: { message } }))
      }
      className={buttonVariants({ variant: "primary", size: "lg" })}
    >
      <MessageCircle aria-hidden="true" className="size-5" />
      {label}
    </button>
  );
}
