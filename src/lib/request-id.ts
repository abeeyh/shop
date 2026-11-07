// docs/16 §3. Uso no servidor: logger.child({ requestId: getRequestId(await headers()) })
export const REQUEST_ID_HEADER = "x-request-id";

// o proxy sempre sobrescreve com um UUID; o formato é conferido por defesa (valor vai para o log)
export function getRequestId(headers: Headers): string {
  const id = headers.get(REQUEST_ID_HEADER);
  return id && /^[\w-]{1,64}$/.test(id) ? id : "sem-request-id";
}
