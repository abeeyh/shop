import { expireDueOrders } from "@/features/orders/queries";
import { isAuthorizedCron } from "@/lib/cron";
import { errorSummary, logger } from "@/lib/logger";
import { getRequestId } from "@/lib/request-id";

const errorBody = (code: string, requestId: string) => ({ error: { code, message: code, requestId } });

// Cron a cada minuto: pedido sem pagamento em 2 h é cancelado e devolve a vaga (RN-34)
export async function GET(request: Request) {
  const requestId = getRequestId(request.headers);
  if (!isAuthorizedCron(request.headers)) {
    return Response.json(errorBody("unauthorized", requestId), { status: 401 });
  }
  try {
    const expired = await expireDueOrders();
    if (expired) logger.info({ event: "order.expired", expired, requestId }, "pedidos expirados");
    return Response.json({ expired }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    // vaga presa = venda perdida; precisa alertar
    logger.error({ event: "order.expire_failed", requestId, ...errorSummary(err) }, "falha ao expirar");
    return Response.json(errorBody("expire_failed", requestId), { status: 500 });
  }
}
