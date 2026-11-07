import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import type { getTranslations } from "next-intl/server";
import type { ItemOptions } from "@/features/pricing/rules";

export type CartT = Awaited<ReturnType<typeof getTranslations<"Cart">>>;

// detalhes do item no idioma de quem vê — carrinho, pedido e fila da equipe usam o mesmo texto
export function describeItem(options: ItemOptions, quantity: number, t: CartT): string {
  const o = options;
  if (o.kind === "gold") return `${o.realm} · ${t(o.faction)} · ${o.character} · ${quantity}k`;
  if (o.kind === "raid") return t(`loot.${o.loot}`);
  return `+${o.keyLevel} × ${t("runs", { n: quantity })}${o.timed ? ` · ${t("timed")}` : ""}`;
}
