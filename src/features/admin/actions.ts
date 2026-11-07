"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/features/auth/staff";
import { routing } from "@/i18n/routing";
import {
  activeProductCount,
  categoryKindOf,
  isUniqueViolation,
  saveCategoryRow,
  saveProductRow,
} from "./queries";
import { categoryInput, fieldsOf, productInput } from "./schemas";

export type SaveState = { status: "idle" | "ok" | "error"; fields: string[] };

const meta = z.object({ locale: z.enum(routing.locales), id: z.union([z.literal(""), z.uuid()]) });

async function guard(form: FormData) {
  const m = meta.parse({ locale: form.get("locale"), id: form.get("id") ?? "" });
  await requireStaff(m.locale); // RN-02, RN-06: só admin com 2FA
  return m.id || null;
}

async function persist(write: () => Promise<void>): Promise<SaveState> {
  try {
    await write();
  } catch (err) {
    if (isUniqueViolation(err)) return { status: "error", fields: ["slug"] };
    throw err;
  }
  refresh();
  return { status: "ok", fields: [] };
}

// RN-13, RN-72 (nunca apaga, só desativa), RN-73 (não desativa com produto ativo)
export async function saveCategory(_prev: SaveState, form: FormData): Promise<SaveState> {
  const id = await guard(form);
  const parsed = categoryInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", fields: fieldsOf(parsed.error) };
  if (id && !parsed.data.active && (await activeProductCount(id)) > 0)
    return { status: "error", fields: ["activeProducts"] };
  return persist(() => saveCategoryRow(id, parsed.data));
}

// RN-19, RN-12; unidade do gold vem do tipo da categoria (RN-15)
export async function saveProduct(_prev: SaveState, form: FormData): Promise<SaveState> {
  const id = await guard(form);
  const parsed = productInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", fields: fieldsOf(parsed.error) };
  const kind = await categoryKindOf(parsed.data.categoryId);
  if (!kind) return { status: "error", fields: ["categoryId"] };
  return persist(() => saveProductRow(id, parsed.data, kind === "gold" ? "per_1k_gold" : null));
}
