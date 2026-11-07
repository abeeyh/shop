import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { env } from "./env";
import { errorSummary, logger } from "./logger";
import { readyValkey } from "./valkey";

// Limites como configuração (docs/13 §1: sem número mágico espalhado). Valores em docs/09 §2.
export const RATE_LIMITS = {
  request: { limit: env.RATE_LIMIT_REQUESTS_PER_MIN, windowMs: 60_000 }, // por IP, toda página/API no proxy
  search: { limit: 30, windowMs: 60_000 }, // RN-105
  coupon: { limit: 10, windowMs: 60 * 60_000 }, // RN-28: por IP
  report: { limit: 5, windowMs: 60 * 60_000 }, // RN-91: por IP
  chatStart: { limit: 5, windowMs: 60 * 60_000 }, // RN-97: conversas novas por IP
  chatMessage: { limit: 20, windowMs: 60_000 }, // RN-97: por conversa
  checkout: { limit: 10, windowMs: 10 * 60_000 }, // por IP: cada checkout reserva vaga e cupom
  login: { limit: 10, windowMs: 10 * 60_000 }, // por IP e por e-mail: senha e código do 2FA (docs/09 §2)
} as const;

export type RateLimitResult = { allowed: boolean; remaining: number; resetMs: number };
type Options = { key: string; limit: number; windowMs: number; failClosed?: boolean };

// Janela fixa atômica: INCR + PEXPIRE no mesmo script.
const SCRIPT =
  "local c = redis.call('INCR', KEYS[1]) " +
  "if c == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end " +
  "return {c, redis.call('PTTL', KEYS[1])}";

const UNAVAILABLE_LOG_INTERVAL_MS = 60_000;
let lastUnavailableLog = 0;
// Disjuntor: após uma falha do Valkey, 5 s sem consultá-lo (Valkey travado custaria 150 ms por requisição).
export const BREAKER_COOLDOWN_MS = 5_000;
let breakerOpenUntil = 0;

// Valkey fora do ar: tráfego geral passa (failClosed=false), rotas sensíveis bloqueiam (failClosed=true).
function unavailable(failClosed: boolean, err: unknown): RateLimitResult {
  if (Date.now() - lastUnavailableLog > UNAVAILABLE_LOG_INTERVAL_MS) {
    lastUnavailableLog = Date.now();
    logger.error(
      { event: "rate_limit.unavailable", failClosed, ...errorSummary(err) },
      "rate limit indisponível",
    );
  }
  return { allowed: !failClosed, remaining: 0, resetMs: 0 };
}

let lastUnknownIpLog = 0;

// Requisição sem IP válido cai no balde "ip:unknown" (fail-safe). Em production isso não deveria
// acontecer: a CDN sempre envia CLIENT_IP_HEADER. Alerta no máximo 1×/min.
export function noteUnknownIp(appEnv: string): void {
  if (appEnv !== "production" || Date.now() - lastUnknownIpLog < UNAVAILABLE_LOG_INTERVAL_MS) return;
  lastUnknownIpLog = Date.now();
  logger.warn(
    { event: "rate_limit.unknown_ip" },
    "requisição sem IP válido: conferir CDN e CLIENT_IP_HEADER",
  );
}

export async function rateLimit({
  key,
  limit,
  windowMs,
  failClosed = false,
}: Options): Promise<RateLimitResult> {
  // disjuntor aberto: Valkey falhou há pouco, não paga o timeout de novo em cada requisição
  if (Date.now() < breakerOpenUntil) return unavailable(failClosed, new Error("disjuntor aberto"));
  const client = await readyValkey();
  if (!client) return unavailable(failClosed, new Error("VALKEY_URL não configurada"));
  try {
    const [count, ttl] = (await client.eval(SCRIPT, 1, `rl:${key}`, windowMs)) as [number, number];
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetMs: ttl > 0 ? ttl : windowMs,
    };
  } catch (err) {
    breakerOpenUntil = Date.now() + BREAKER_COOLDOWN_MS;
    return unavailable(failClosed, err);
  }
}

// Só para testes: fecha o disjuntor.
export function resetBreaker(): void {
  breakerOpenUntil = 0;
}

export function tooManyRequests(result: RateLimitResult, requestId: string): Response {
  const retryAfter = Math.max(1, Math.ceil(result.resetMs / 1000));
  return Response.json(
    { error: { code: "rate_limited", message: "Too many requests", requestId } },
    { status: 429, headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" } },
  );
}
