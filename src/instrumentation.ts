import type { Instrumentation } from "next";

// docs/16 §3 / RN-90: todo erro do servidor vai para o log com o requestId e o digest — o mesmo ID
// que a tela de erro mostra ao usuário. Sem query string (pode ter token do pedido) nem mensagem crua.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { errorSummary, logger } = await import("@/lib/logger");
  const header = request.headers["x-request-id"];
  logger.error(
    {
      event: "request.error",
      requestId: Array.isArray(header) ? header[0] : header,
      digest: typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : undefined,
      path: request.path.split("?")[0],
      method: request.method,
      routePath: context.routePath,
      routeType: context.routeType,
      ...errorSummary(err),
    },
    "erro no servidor",
  );
};
