import { purgeAccessLogs } from "@/features/access-log";
import { isAuthorizedCron } from "@/lib/cron";
import { errorSummary, logger } from "@/lib/logger";
import { getRequestId } from "@/lib/request-id";

const errorBody = (code: string, requestId: string) => ({ error: { code, message: code, requestId } });

// Cron diário: apaga log de acesso com mais de 6 meses (docs/16 §9).
export async function GET(request: Request) {
  const requestId = getRequestId(request.headers);
  if (!isAuthorizedCron(request.headers)) {
    return Response.json(errorBody("unauthorized", requestId), { status: 401 });
  }
  try {
    const deleted = await purgeAccessLogs();
    logger.info({ event: "access_log.purged", deleted, requestId }, "logs de acesso antigos apagados");
    return Response.json({ deleted }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    // retenção legal não pode falhar em silêncio
    logger.error({ event: "access_log.purge_failed", requestId, ...errorSummary(err) }, "falha na limpeza");
    return Response.json(errorBody("purge_failed", requestId), { status: 500 });
  }
}
