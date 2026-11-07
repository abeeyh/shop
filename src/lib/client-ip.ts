import { isIP } from "node:net";

// IP do cliente a partir do header confiável da CDN/proxy (CLIENT_IP_HEADER — docs/16 §9).
// Primeiro valor da lista; inválido ou ausente → null.
export function clientIp(headers: Headers, headerName: string): string | null {
  const first = headers.get(headerName)?.split(",")[0]?.trim() ?? "";
  return isIP(first) ? first : null;
}

// Expande IPv6 abreviado ("2001:db8::1") para os 8 grupos.
function expandIpv6(ip: string): string[] {
  const [head = "", tail = ""] = ip.toLowerCase().split("::");
  const h = head ? head.split(":") : [];
  const t = tail ? tail.split(":") : [];
  const missing = ip.includes("::") ? 8 - h.length - t.length : 0;
  return [...h, ...Array<string>(missing).fill("0"), ...t].map((g) => g.replace(/^0+(?=.)/, ""));
}

// Chave de rate limit: IPv4 por endereço; IPv6 pelo prefixo /64 — um único cliente costuma ter um /64
// inteiro e trocaria de endereço a cada requisição para fugir do limite (revisão de segurança da #48).
export function rateLimitKey(ip: string | null): string {
  if (!ip) return "ip:unknown";
  if (isIP(ip) !== 6) return `ip:${ip}`;
  return `ip6:${expandIpv6(ip).slice(0, 4).join(":")}::/64`;
}
