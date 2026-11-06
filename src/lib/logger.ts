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

function transport() {
  const targets: TransportTargetOptions[] = [];
  if (env.BETTERSTACK_SOURCE_TOKEN && env.BETTERSTACK_INGEST_HOST) {
    targets.push({
      target: "@logtail/pino",
      options: {
        sourceToken: env.BETTERSTACK_SOURCE_TOKEN,
        options: { endpoint: `https://${env.BETTERSTACK_INGEST_HOST}` },
      },
    });
  }
  // stdout sempre: o host também coleta, e local/test não dependem do Better Stack
  targets.push({ target: "pino/file", options: { destination: 1 } });
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
  env.NODE_ENV === "test" ? undefined : transport(),
);
