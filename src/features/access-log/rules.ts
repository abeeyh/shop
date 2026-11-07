import { isIP } from "node:net";

export const RETENTION_MONTHS = 6; // Marco Civil art. 15
const MAX_ROUTE_LENGTH = 2048;
const NOT_RECORDED = new Set(["/api/health"]); // monitor de uptime a cada minuto, não é acesso de usuário

// Data antes da qual o registro pode ser apagado: exatamente 6 meses antes de `now`.
// Ajusta o dia ao fim do mês (31/ago → 28 ou 29/fev) para nunca apagar antes do prazo.
export function accessLogCutoff(now: Date, months = RETENTION_MONTHS): Date {
  const cutoff = new Date(now);
  const day = cutoff.getUTCDate();
  cutoff.setUTCDate(1);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
  const lastDay = new Date(Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth() + 1, 0)).getUTCDate();
  cutoff.setUTCDate(Math.min(day, lastDay));
  return cutoff;
}

// IP do cliente a partir do header confiável da CDN/proxy (CLIENT_IP_HEADER). Valor inválido → null.
export function clientIp(headers: Headers, headerName: string): string | null {
  const first = headers.get(headerName)?.split(",")[0]?.trim() ?? "";
  return isIP(first) ? first : null;
}

export function shouldRecordAccess(pathname: string): boolean {
  return !NOT_RECORDED.has(pathname);
}

// Segmento com cara de token (>= 32 caracteres, com letras e números): ex. link de redefinir senha.
// Falso positivo só deixa o registro menos legível; nunca guarda um token por 6 meses.
const TOKEN_SEGMENT = /^(?=.*\d)(?=.*[A-Za-z])[A-Za-z0-9._~-]{32,}$/;

// Só o caminho (query string pode ter dados pessoais) e sem tokens (docs/16 §9).
export function sanitizeRoute(pathname: string): string {
  return pathname
    .split("/")
    .map((segment) => (TOKEN_SEGMENT.test(segment) ? ":token" : segment))
    .join("/")
    .slice(0, MAX_ROUTE_LENGTH);
}
