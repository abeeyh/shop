// API pública da feature. Sem import estático do banco: o proxy importa este arquivo
// e precisa funcionar mesmo sem DATABASE_URL (local, testes, build).
import { accessLogCutoff, clientIp, sanitizeRoute, shouldRecordAccess } from "./rules";

export { accessLogCutoff, shouldRecordAccess };

type AccessRequest = { headers: Headers; method: string; pathname: string; requestId: string };

// docs/16 §9: falha ao gravar vira logger.error + alerta, mas nunca derruba a requisição.
export async function recordAccess(req: AccessRequest): Promise<void> {
  try {
    const { env } = await import("@/lib/env");
    if (!env.DATABASE_URL || !shouldRecordAccess(req.pathname)) return;
    const { insertAccessLog } = await import("./queries");
    await insertAccessLog({
      ip: clientIp(req.headers, env.CLIENT_IP_HEADER),
      method: req.method,
      route: sanitizeRoute(req.pathname),
      requestId: req.requestId,
    });
  } catch (err) {
    const { logger } = await import("@/lib/logger");
    logger.error(
      { err, event: "access_log.write_failed", requestId: req.requestId },
      "falha ao gravar log de acesso",
    );
  }
}

export async function purgeAccessLogs(now = new Date()): Promise<number> {
  const { deleteAccessLogsBefore } = await import("./queries");
  return deleteAccessLogsBefore(accessLogCutoff(now));
}
