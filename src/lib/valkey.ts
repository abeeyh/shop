import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { once } from "node:events";
import Valkey from "iovalkey";
import { env } from "./env";

let client: Valkey | null | undefined;

// Cliente compartilhado (rate limit, pub/sub do chat). Sem VALKEY_URL → null.
// Falha rápido: sem fila offline e timeout curto, para nunca segurar a requisição do usuário.
export function getValkey(): Valkey | null {
  if (client !== undefined) return client;
  client = env.VALKEY_URL
    ? new Valkey(env.VALKEY_URL, {
        lazyConnect: false,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        connectTimeout: 1000,
        commandTimeout: 500,
      })
    : null;
  // erro de conexão é tratado por quem chama; sem este handler o processo registraria "unhandled error"
  client?.on("error", () => undefined);
  return client;
}

const READY_TIMEOUT_MS = 1000;
let firstConnection: Promise<unknown> | null = null;

// Só na PRIMEIRA conexão (processo acabou de subir) espera até 1 s — uma espera única,
// compartilhada por todas as requisições. Depois disso, se o Valkey cair, o comando falha na hora:
// a requisição nunca fica parada esperando reconexão (verificado com o Valkey desligado).
export async function readyValkey(): Promise<Valkey | null> {
  const c = getValkey();
  if (!c || c.status === "ready") return c;
  firstConnection ??= Promise.race([
    once(c, "ready"),
    new Promise((r) => setTimeout(r, READY_TIMEOUT_MS)),
  ]).catch(() => undefined);
  await firstConnection;
  return c;
}
