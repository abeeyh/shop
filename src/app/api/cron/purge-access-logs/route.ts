import { purgeAccessLogs } from "@/features/access-log";
import { isAuthorizedCron } from "@/lib/cron";
import { logger } from "@/lib/logger";
import { getRequestId } from "@/lib/request-id";

// Cron diário: apaga log de acesso com mais de 6 meses (docs/16 §9).
export async function GET(request: Request) {
  const requestId = getRequestId(request.headers);
  if (!isAuthorizedCron(request.headers)) {
    return Response.json(
      { error: { code: "unauthorized", message: "Unauthorized", requestId } },
      { status: 401 },
    );
  }
  const deleted = await purgeAccessLogs();
  logger.info({ event: "access_log.purged", deleted, requestId }, "logs de acesso antigos apagados");
  return Response.json({ deleted }, { headers: { "Cache-Control": "no-store" } });
}
