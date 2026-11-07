import pino, { type TransportTargetOptions } from "pino";
import { env } from "./env";

// docs/16-observabilidade.md §3: chaves que nunca podem sair em log
export const REDACT_PATHS = [
  "password",
  "*.password",
  "token",
  "*.token",
  "cookie",
  "*.cookie",
  "authorization",
  "*.authorization",
  "headers.authorization",
  "headers.cookie",
  "card",
  "*.card",
  "cvv",
  "*.cvv",
  "seed",
  "*.seed",
  "privateKey",
  "*.privateKey",
];

export function maskEmail(email: string): string {
  const [user = "", domain = ""] = email.split("@");
  if (!user || !domain) return "***";
  const [host = "", ...rest] = domain.split(".");
  const tld = rest.length ? `.${rest.join(".")}` : "";
  return `${user[0]}***@${host[0] ?? ""}***${tld}`;
}

// Só nome e código: mensagens de erro de banco trazem os parâmetros da query (dados pessoais).
export function errorSummary(err: unknown): { errName: string; errCode?: string } {
  const e = err as { name?: unknown; code?: unknown; cause?: { code?: unknown } } | null;
  const code = e?.cause?.code ?? e?.code;
  return {
    errName: typeof e?.name === "string" ? e.name : "UnknownError",
    ...(typeof code === "string" ? { errCode: code } : {}),
  };
}

// Sem Better Stack: stdout direto, sem worker (o host coleta o stdout).
// shortcut: o transport do Better Stack roda num worker cujas dependências o build standalone
// não copia (pino-abstract-transport); resolver antes de configurar o token em produção (issue #11).
function destination() {
  if (env.NODE_ENV === "test" || !env.BETTERSTACK_SOURCE_TOKEN || !env.BETTERSTACK_INGEST_HOST)
    return undefined;
  const targets: TransportTargetOptions[] = [
    {
      target: "@logtail/pino",
      options: {
        sourceToken: env.BETTERSTACK_SOURCE_TOKEN,
        options: { endpoint: `https://${env.BETTERSTACK_INGEST_HOST}` },
      },
    },
    { target: "pino/file", options: { destination: 1 } },
  ];
  return pino.transport({ targets });
}

const defaultLevel = env.APP_ENV === "production" ? "info" : "debug";

export const logger = pino(
  {
    level: env.LOG_LEVEL ?? defaultLevel,
    base: { env: env.APP_ENV, release: env.APP_RELEASE },
    redact: { paths: REDACT_PATHS, censor: "[redacted]" },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  destination(),
);
