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
  const last = useRef(0);

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
      const data = JSON.parse(e.data) as Partial<ChatMessage> & { status?: string };
      if (data.status && data.id === undefined) setStatus(data.status);
      else merge([data as ChatMessage]);
    };
    return () => {
      alive = false;
      source.close();
    };
  }, [conversationId]);

  return { messages, status };
}
