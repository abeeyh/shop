"use client";

import { useEffect, useRef, useState } from "react";

export type ChatMessage = {
  id: number;
  authorType: "customer" | "staff" | "system";
  body: string;
  createdAt: string;
};

// Histórico + SSE. A cada (re)conexão busca o que perdeu a partir do último id: nada se perde se a
// conexão cair (docs/04 — Chat). Mensagens chegam pelo SSE e são deduplicadas pelo id.
export function useChat(conversationId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [customerTyping, setCustomerTyping] = useState(false); // #168: só a tela da equipe usa
  const last = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!conversationId) return;
    let alive = true;
    const merge = (incoming: ChatMessage[]) => {
      if (!alive || incoming.length === 0) return;
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const next = [...prev, ...incoming.filter((m) => !seen.has(m.id))].sort((a, b) => a.id - b.id);
        last.current = next.at(-1)?.id ?? last.current;
        return next;
      });
    };
    const catchUp = () =>
      fetch(`/api/support/conversations/${conversationId}/messages?after=${last.current}`)
        .then((r) => (r.ok ? r.json() : []))
        .then(merge)
        .catch(() => undefined);
    const source = new EventSource(`/api/support/conversations/${conversationId}/stream`);
    source.onopen = () => void catchUp();
    source.onmessage = (e) => {
      const data = JSON.parse(e.data) as Partial<ChatMessage> & { status?: string; typing?: string };
      if (data.typing === "customer") {
        // some sozinho se o cliente parar (ele avisa no máx. a cada 3 s enquanto digita)
        setCustomerTyping(true);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setCustomerTyping(false), 4_000);
      } else if (data.status && data.id === undefined) setStatus(data.status);
      else {
        if (data.authorType === "customer") setCustomerTyping(false); // a mensagem chegou
        merge([data as ChatMessage]);
      }
    };
    return () => {
      alive = false;
      clearTimeout(typingTimer.current);
      source.close();
    };
  }, [conversationId]);

  return { messages, status, customerTyping };
}
