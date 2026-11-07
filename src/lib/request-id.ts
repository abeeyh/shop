// docs/16 §3. Uso no servidor: logger.child({ requestId: getRequestId(await headers()) })
export const REQUEST_ID_HEADER = "x-request-id";

export function getRequestId(headers: Headers): string {
  return headers.get(REQUEST_ID_HEADER) ?? "sem-request-id";
}
