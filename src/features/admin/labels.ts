import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import type { getTranslations } from "next-intl/server";

export type AdminT = Awaited<ReturnType<typeof getTranslations<"Admin">>>;

const FIELDS = [
  "generic",
  "name",
  "slug",
  "kind",
  "description",
  "imageUrl",
  "sortOrder",
  "categoryId",
  "tags",
  "addons",
  "optionAxes",
  "variants",
  "maxQuantity",
  "price",
  "activeProducts",
  "type",
  "value",
  "target",
  "startsAt",
  "endsAt",
  "code",
  "maxUses",
  "maxUsesPerEmail",
  "minOrder",
] as const;

// mensagens de erro por campo para o ActionForm (o cliente não traduz — docs/04)
export const formErrors = (t: AdminT): Record<string, string> =>
  Object.fromEntries(FIELDS.map((f) => [f, t(`formErrors.${f}`)]));

// Doc 17 §3: textos do excluir com confirmação (RN-72)
export const deleteLabels = (t: AdminT, name: string) => ({
  delete: t("crud.delete"),
  title: t("crud.deleteTitle", { name }),
  message: t("crud.deleteMessage"),
  confirm: t("crud.deleteConfirm"),
  cancel: t("confirm.cancel"),
  inUse: t("crud.inUse"),
  generic: t("formErrors.generic"),
});

export const filterLabels = (t: AdminT) => ({
  search: t("crud.search"),
  category: t("fields.category"),
  allCategories: t("crud.allCategories"),
  status: t("table.status"),
  all: t("crud.allStatuses"),
  active: t("table.active"),
  inactive: t("table.inactive"),
});

// RF-09 a RF-11: textos do editor visual do produto
export const optionLabels = (t: AdminT) => ({
  addons: t("options.addonsTitle"),
  addonName: t("options.addonName"),
  percent: t("options.percent"),
  addAddon: t("options.addAddon"),
  axes: t("options.axesTitle"),
  axisName: t("options.axisName"),
  style: t("options.style"),
  slider: t("options.slider"),
  boxes: t("options.boxes"),
  values: t("options.values"),
  valuesHint: t("options.valuesHint"),
  addAxis: t("options.addAxis"),
  variants: t("options.variantsTitle"),
  variantsHint: t("options.variantsHint"),
  include: t("options.include"),
  price: t("fields.price"),
  onRequest: t("fields.priceOnRequest"),
  note: t("options.note"),
  remove: t("options.remove"),
  tooMany: t("options.tooMany"),
});
