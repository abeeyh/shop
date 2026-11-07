import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { errorSummary, logger } from "./logger";
import { readyValkey } from "./valkey";

// Limites como configuração (docs/13 §1: sem número mágico espalhado). Valores em docs/09 §2.
export const RATE_LIMITS = {
  request: { limit: 300, windowMs: 60_000 }, // por IP, toda página/API no proxy
  search: { limit: 30, windowMs: 60_000 }, // RN-105
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

export async function rateLimit({
  key,
  limit,
  windowMs,
  failClosed = false,
}: Options): Promise<RateLimitResult> {
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
    return unavailable(failClosed, err);
  }
}

export function tooManyRequests(result: RateLimitResult, requestId: string): Response {
  const retryAfter = Math.max(1, Math.ceil(result.resetMs / 1000));
  return Response.json(
    { error: { code: "rate_limited", message: "Too many requests", requestId } },
    { status: 429, headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" } },
  );
}
