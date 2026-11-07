// API pública da feature. Sem import estático do banco: o proxy importa este arquivo
// e precisa funcionar mesmo sem DATABASE_URL (local, testes, build).
import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { clientIp } from "@/lib/client-ip";
import { accessLogCutoff, sanitizeRoute, shouldRecordAccess } from "./rules";

export { accessLogCutoff, shouldRecordAccess };

type AccessRequest = { headers: Headers; method: string; pathname: string; requestId: string };

// Com banco lento, gravações pendentes não crescem sem limite na memória.
export const MAX_IN_FLIGHT = 50;
const DROP_LOG_INTERVAL_MS = 60_000;
let inFlight = 0;
let lastDropLog = 0;

async function logProblem(event: string, fields: Record<string, unknown>) {
  const { logger, errorSummary } = await import("@/lib/logger");
  const { err, ...rest } = fields;
  // só nome/código do erro: a mensagem do Drizzle traz os parâmetros (IP, rota)
  logger.error({ event, ...rest, ...(err === undefined ? {} : errorSummary(err)) }, event);
}

// docs/16 §9: falha ao gravar vira logger.error + alerta, mas nunca derruba a requisição.
export async function recordAccess(req: AccessRequest): Promise<void> {
  try {
    const { env } = await import("@/lib/env");
    if (!env.DATABASE_URL || !shouldRecordAccess(req.pathname)) return;
    if (inFlight >= MAX_IN_FLIGHT) {
      if (Date.now() - lastDropLog > DROP_LOG_INTERVAL_MS) {
        lastDropLog = Date.now();
        await logProblem("access_log.dropped", { inFlight });
      }
      return;
    }
    inFlight++;
    try {
      const { insertAccessLog } = await import("./queries");
      await insertAccessLog({
        // em production o header é obrigatório (env.ts); o padrão só vale em local/homologação
        ip: clientIp(req.headers, env.CLIENT_IP_HEADER ?? "x-forwarded-for"),
        method: req.method,
        route: sanitizeRoute(req.pathname),
        requestId: req.requestId,
      });
    } finally {
      inFlight--;
    }
  } catch (err) {
    await logProblem("access_log.write_failed", { err, requestId: req.requestId });
  }
}

export async function purgeAccessLogs(now = new Date()): Promise<number> {
  const { deleteAccessLogsBefore } = await import("./queries");
  return deleteAccessLogsBefore(accessLogCutoff(now));
}
