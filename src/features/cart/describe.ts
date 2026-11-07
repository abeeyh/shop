import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import type { getTranslations } from "next-intl/server";
import type { ItemOptions } from "@/features/pricing/rules";

export type CartT = Awaited<ReturnType<typeof getTranslations<"Cart">>>;

type Legacy = { kind: "raid"; loot: string } | { kind: "dungeon"; keyLevel: number; timed: boolean };

// detalhes do item no idioma de quem vê — carrinho, pedido e fila da equipe usam o mesmo texto.
// Itens antigos (raid/dungeon antes do #94) continuam legíveis nos pedidos já feitos.
export function describeItem(options: ItemOptions | Legacy, quantity: number, t: CartT): string {
  const o = options;
  const who = (x: { realm: string; faction: "alliance" | "horde"; character: string }) =>
    `${x.realm} · ${t(x.faction)} · ${x.character}`;
  if (o.kind === "gold") return `${who(o)} · ${quantity}k`;
  if (o.kind === "service")
    return [who(o), ...o.addons, quantity > 1 ? `× ${quantity}` : ""].filter(Boolean).join(" · ");
  if (o.kind === "raid") return t(`loot.${o.loot as "none" | "armor" | "full"}`);
  return `+${o.keyLevel} × ${t("runs", { n: quantity })}${o.timed ? ` · ${t("timed")}` : ""}`;
}
