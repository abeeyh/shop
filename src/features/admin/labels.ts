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
