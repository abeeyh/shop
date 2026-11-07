"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/features/auth/staff";
import { routing } from "@/i18n/routing";
import { env } from "@/lib/env";
import { isPwnedPassword } from "./hibp";
import { acceptInvite, createInvite, emailTaken, LastAdminError, openInvite, updateStaff } from "./queries";

export type InviteState = { status: "idle" | "ok" | "error"; fields: string[]; link?: string };
export type StaffState = { status: "idle" | "ok" | "error"; fields: string[] };
export type AcceptState = { error: "" | "invalid" | "mismatch" | "pwned" | "expired" };

const locale = z.enum(routing.locales);
const role = z.enum(["admin", "suporte"]);
const languages = (form: FormData) =>
  form.getAll("languages").filter((l) => routing.locales.some((x) => x === l)) as string[];

// RN-04: só admin convida; o link aparece uma vez para ele enviar (shortcut: e-mail entra com o provedor)
export async function inviteStaff(_prev: InviteState, form: FormData): Promise<InviteState> {
  const input = z.object({ locale, email: z.email().max(254), role }).safeParse(Object.fromEntries(form));
  if (!input.success) return { status: "error", fields: input.error.issues.map((i) => String(i.path[0])) };
  const admin = await requireStaff(input.data.locale);
  const email = input.data.email.toLowerCase();
  if (await emailTaken(email)) return { status: "error", fields: ["emailTaken"] };
  const token = await createInvite(admin.user.id, {
    email,
    role: input.data.role,
    languages: languages(form),
  });
  return { status: "ok", fields: [], link: `${env.APP_URL}/${input.data.locale}/admin/convite/${token}` };
}

// RN-05/RN-06: papel, idiomas e ativo; admin não se desativa nem se rebaixa (não fica sem acesso)
export async function saveStaffMember(_prev: StaffState, form: FormData): Promise<StaffState> {
  const input = z
    .object({
      locale,
      id: z.string().min(1).max(64),
      role,
      active: z.preprocess((v) => v === "on", z.boolean()),
    })
    .safeParse(Object.fromEntries(form));
  if (!input.success) return { status: "error", fields: ["generic"] };
  const admin = await requireStaff(input.data.locale);
  if (input.data.id === admin.user.id && (!input.data.active || input.data.role !== "admin"))
    return { status: "error", fields: ["self"] };
  try {
    await updateStaff(admin.user.id, input.data.id, {
      role: input.data.role,
      active: input.data.active,
      languages: languages(form),
    });
  } catch (err) {
    if (err instanceof LastAdminError) return { status: "error", fields: ["lastAdmin"] };
    throw err;
  }
  refresh();
  return { status: "ok", fields: [] };
}

// Aceite do convite: senha forte e fora de vazamentos (docs/09); depois o login ativa o 2FA (RN-02)
export async function acceptStaffInvite(_prev: AcceptState, form: FormData): Promise<AcceptState> {
  const input = z
    .object({
      locale,
      token: z.string().min(20).max(100),
      name: z.string().trim().min(2).max(60),
      password: z.string().min(12).max(200),
      confirm: z.string(),
    })
    .safeParse(Object.fromEntries(form));
  if (!input.success) return { error: "invalid" };
  const { token, name, password, confirm, locale: l } = input.data;
  if (password !== confirm) return { error: "mismatch" };
  if (!(await openInvite(token))) return { error: "expired" }; // token inventado não chega ao HIBP nem ao scrypt
  if (await isPwnedPassword(password)) return { error: "pwned" };
  if (!(await acceptInvite(token, name, password))) return { error: "expired" };
  redirect(`/${l}/admin/entrar`);
}
