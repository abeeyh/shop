"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/features/auth/staff";
import { routing } from "@/i18n/routing";
import {
  activeProductCount,
  categoryKindOf,
  deleteCatalogRow,
  isForeignKeyViolation,
  isUniqueViolation,
  saveCategoryRow,
  saveCouponRow,
  saveProductRow,
  savePromotionRow,
  saveTagRow,
} from "./queries";
import { categoryInput, couponInput, fieldsOf, productInput, promotionInput, tagInput } from "./schemas";

export type SaveState = { status: "idle" | "ok" | "error"; fields: string[] };

const meta = z.object({ locale: z.enum(routing.locales), id: z.union([z.literal(""), z.uuid()]) });

const PATHS = {
  category: "categorias",
  tag: "tags",
  product: "produtos",
  promotion: "promocoes",
  coupon: "cupons",
} as const;

async function guard(form: FormData) {
  const m = meta.parse({ locale: form.get("locale"), id: form.get("id") ?? "" });
  const staff = await requireStaff(m.locale); // RN-02, RN-06: só admin com 2FA
  return { id: m.id || null, staffId: staff.user.id, locale: m.locale };
}

// Criar (sem id) volta para a lista; editar fica na página com o "Salvo" (doc 11 §9)
async function persist(
  write: () => Promise<void>,
  done: string | null,
  uniqueField = "slug",
): Promise<SaveState> {
  try {
    await write();
  } catch (err) {
    if (isUniqueViolation(err)) return { status: "error", fields: [uniqueField] };
    if (isForeignKeyViolation(err)) return { status: "error", fields: ["target"] };
    throw err;
  }
  refresh();
  if (done) redirect(done);
  return { status: "ok", fields: [] };
}

// RN-13, RN-72 (nunca apaga, só desativa), RN-73 (não desativa com produto ativo)
export async function saveCategory(_prev: SaveState, form: FormData): Promise<SaveState> {
  const { id, staffId, locale } = await guard(form);
  const parsed = categoryInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", fields: fieldsOf(parsed.error) };
  if (id && !parsed.data.active && (await activeProductCount(id)) > 0)
    return { status: "error", fields: ["activeProducts"] };
  return persist(
    () => saveCategoryRow(staffId, id, parsed.data),
    id ? null : `/${locale}/admin/${PATHS.category}`,
  );
}

// #160: tag (slug único)
export async function saveTag(_prev: SaveState, form: FormData): Promise<SaveState> {
  const { id, staffId, locale } = await guard(form);
  const parsed = tagInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", fields: fieldsOf(parsed.error) };
  return persist(() => saveTagRow(staffId, id, parsed.data), id ? null : `/${locale}/admin/${PATHS.tag}`);
}

// RN-19, RN-12; unidade do gold vem do tipo da categoria (RN-15); tags inexistentes: o banco recusa (FK)
export async function saveProduct(_prev: SaveState, form: FormData): Promise<SaveState> {
  const { id, staffId, locale } = await guard(form);
  const parsed = productInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", fields: fieldsOf(parsed.error) };
  const kind = await categoryKindOf(parsed.data.categoryId);
  if (!kind) return { status: "error", fields: ["categoryId"] };
  if (kind === "gold" && parsed.data.optionAxes.length) return { status: "error", fields: ["optionAxes"] };
  return persist(
    () => saveProductRow(staffId, id, parsed.data, kind === "gold" ? "per_1k_gold" : null),
    id ? null : `/${locale}/admin/${PATHS.product}`,
  );
}

// RN-21 a RN-24
export async function savePromotion(_prev: SaveState, form: FormData): Promise<SaveState> {
  const { id, staffId, locale } = await guard(form);
  const parsed = promotionInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", fields: fieldsOf(parsed.error) };
  return persist(
    () => savePromotionRow(staffId, id, parsed.data),
    id ? null : `/${locale}/admin/${PATHS.promotion}`,
  );
}

// RN-25; RN-72: cupom nunca é apagado, só desativado
export async function saveCoupon(_prev: SaveState, form: FormData): Promise<SaveState> {
  const { id, staffId, locale } = await guard(form);
  const parsed = couponInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", fields: fieldsOf(parsed.error) };
  return persist(
    () => saveCouponRow(staffId, id, parsed.data),
    id ? null : `/${locale}/admin/${PATHS.coupon}`,
    "code",
  );
}

// Doc 17 §3: excluir com confirmação (RN-72: só o que nunca foi usado; senão, desativar). Volta à lista.
const deleteInput = z.object({
  entity: z.enum(["category", "tag", "product", "promotion", "coupon"]),
});

export async function deleteEntity(_prev: SaveState, form: FormData): Promise<SaveState> {
  const { id, staffId, locale } = await guard(form);
  const parsed = deleteInput.safeParse({ entity: form.get("entity") });
  if (!id || !parsed.success) return { status: "error", fields: ["generic"] };
  const result = await deleteCatalogRow(parsed.data.entity, staffId, id);
  if (result === "inUse") return { status: "error", fields: ["inUse"] };
  redirect(`/${locale}/admin/${PATHS[parsed.data.entity]}`);
}
