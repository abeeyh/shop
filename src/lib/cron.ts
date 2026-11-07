import { timingSafeEqual } from "node:crypto";
import { env } from "./env";

// docs/09: /api/cron/* exige segredo. Sem CRON_SECRET configurado, nada passa.
export function isAuthorizedCron(headers: Headers, secret = env.CRON_SECRET): boolean {
  if (!secret) return false;
  const given = Buffer.from(headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
