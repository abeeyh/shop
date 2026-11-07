import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import Valkey from "iovalkey";
import { env } from "./env";
import { errorSummary, logger } from "./logger";
import { readyValkey } from "./valkey";

// Pub/sub do chat (docs/04 — Chat): a mensagem já está no banco; o aviso só acorda quem está
// conectado em qualquer instância. Valkey fora: o cliente busca o que perdeu ao reconectar.

export async function publish(channel: string, payload: string): Promise<void> {
  const c = await readyValkey();
  await c?.publish(channel, payload).catch((err) => {
    logger.warn({ event: "pubsub.publish_failed", ...errorSummary(err) }, "falha ao publicar");
  });
}

// Uma conexão de assinatura por processo (modo subscriber não aceita outros comandos)
let subscriber: Valkey | null | undefined;
const listeners = new Map<string, Set<(message: string) => void>>();

function getSubscriber(): Valkey | null {
  if (subscriber !== undefined) return subscriber;
  subscriber = env.VALKEY_URL ? new Valkey(env.VALKEY_URL, { connectTimeout: 1000 }) : null;
  // Valkey fora: o chat perde o tempo real (o cliente busca ao reconectar) — avisa no log, 1×/min
  let lastLog = 0;
  subscriber?.on("error", (err: unknown) => {
    if (Date.now() - lastLog < 60_000) return;
    lastLog = Date.now();
    logger.warn({ event: "pubsub.subscriber_error", ...errorSummary(err) }, "assinatura do chat com erro");
  });
  subscriber?.on("message", (channel: string, message: string) => {
    listeners.get(channel)?.forEach((fn) => fn(message));
  });
  return subscriber;
}

export function subscribe(channel: string, fn: (message: string) => void): () => void {
  const sub = getSubscriber();
  if (!sub) return () => undefined;
  let set = listeners.get(channel);
  if (!set) {
    set = new Set();
    listeners.set(channel, set);
    sub.subscribe(channel).catch(() => undefined);
  }
  set.add(fn);
  return () => {
    set.delete(fn);
    if (set.size === 0) {
      listeners.delete(channel);
      sub.unsubscribe(channel).catch(() => undefined);
    }
  };
}
