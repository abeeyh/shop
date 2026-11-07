import { isIP } from "node:net";

// IP do cliente a partir do header confiável da CDN/proxy (CLIENT_IP_HEADER — docs/16 §9).
// Primeiro valor da lista; inválido ou ausente → null.
export function clientIp(headers: Headers, headerName: string): string | null {
  const first = headers.get(headerName)?.split(",")[0]?.trim() ?? "";
  return isIP(first) ? first : null;
}
