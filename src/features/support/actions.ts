"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { requireStaff } from "@/features/auth/staff";
import { routing } from "@/i18n/routing";
import { clientIp, rateLimitKey } from "@/lib/client-ip";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getTimezone } from "@/lib/preferences";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { getRequestId } from "@/lib/request-id";
import { insertReport, resolveReport } from "./queries";

export type ReportState = { status: "idle" | "ok" | "error" | "limited"; fields: string[] };

const input = z.object({
  locale: z.enum(routing.locales),
  description: z.string().trim().min(10).max(2000),
  email: z.union([z.literal(""), z.email().max(254)]),
  page: z
    .string()
    .max(300)
    .transform((p) => (p.startsWith("/") ? p.split("?")[0]! : "/")), // só o caminho, sem token
  errorId: z
    .string()
    .max(100)
    .regex(/^[\w-]*$/),
  website: z.literal(""), // campo invisível: robô preenche (shortcut: CAPTCHA entra com a decisão do Turnstile)
});

// RN-91: o reporte salva sozinho página, requestId, idioma, região, fuso, navegador e versão
export async function submitReport(_prev: ReportState, form: FormData): Promise<ReportState> {
  const h = await headers();
  const ip = clientIp(h, env.CLIENT_IP_HEADER ?? "x-forwarded-for");
  const limit = await rateLimit({
    key: `report:${rateLimitKey(ip)}`,
    ...RATE_LIMITS.report,
    failClosed: true,
  });
  if (!limit.allowed) return { status: "limited", fields: [] };
  const parsed = input.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", fields: parsed.error.issues.map((i) => String(i.path[0])) };
  const { email, errorId, locale, description, page } = parsed.data; // `website` (isca) fica de fora
  const requestId = getRequestId(h);
  const timezone = await getTimezone();
  await insertReport({
    locale,
    description,
    page,
    email: email || null,
    errorId: errorId || null,
    requestId,
    timezone,
    userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
    release: env.APP_RELEASE,
  });
  logger.info({ event: "bug_report.created", requestId, errorId: errorId || undefined }, "reporte recebido");
  return { status: "ok", fields: [] };
}

export async function markResolved(form: FormData) {
  const m = z.object({ locale: z.enum(routing.locales), id: z.uuid() }).parse(Object.fromEntries(form));
  const staff = await requireStaff(m.locale, ["admin", "suporte"]); // RN-06
  await resolveReport(staff.user.id, m.id);
  refresh();
}
