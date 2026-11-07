// Regras puras da importação do catálogo (#94) — testadas em lib.test.mjs; import.mjs só grava no banco.

// Decisão do dono (2026-11-07): 1.000.000 de gold do sistema de origem = 45 USD (= 45 USDT, RN-12)
export const USDT_CENTS_PER_MILLION = 4500;
// price ≤ 1 (e o 800 do Mythic +19, claramente provisório) vira "sob consulta" (RN-106)
export const PLACEHOLDER_BELOW = 1000;

export const toUsdtCents = (gold) => Math.round((gold * USDT_CENTS_PER_MILLION) / 1_000_000);
export const isOnRequest = (gold) => gold < PLACEHOLDER_BELOW;

// "🔸 Venomous Abyss  8/8 " → "Venomous Abyss 8/8"
export const cleanName = (s) =>
  s
    .replace(/\p{Extended_Pictographic}|️/gu, "")
    .replace(/\s+/g, " ")
    .trim();

export const slugify = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);

// adicional percentual descrito no texto do produto: "Armor Stack +25% added price"
export function addonsFrom(description) {
  const m = /armor stack \+(\d{1,2})%/i.exec(description);
  return m ? [{ name: "Armor Stack", percent: Number(m[1]) }] : [];
}

// "price per tier" → o cliente escolhe quantos tiers (quantidade); o resto é 1 por pedido
export const maxQuantityFrom = (description) => (/price per tier/i.test(description) ? 10 : 1);

// Nome repetido na mesma categoria (PvP 2v2 0-1600 / 0-1800…) ganha a descrição para ficar distinguível
export function toProducts(items) {
  const names = items.map((i) => cleanName(i.name));
  const seen = new Map();
  for (const [idx, i] of items.entries()) {
    const key = `${i.serviceCategoryId}|${names[idx].toLowerCase()}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const slugs = new Set();
  return items.map((i, idx) => {
    const base = names[idx];
    const dup = seen.get(`${i.serviceCategoryId}|${base.toLowerCase()}`) > 1;
    const name = (dup ? `${base} ${cleanName(i.description)}` : base).slice(0, 80);
    let slug = slugify(name);
    if (slugs.has(slug)) slug = `${slug}-${i.id}`;
    slugs.add(slug);
    const onRequest = isOnRequest(i.price);
    return {
      externalId: i.id,
      categoryRef: i.serviceCategoryId,
      subcategoryRef: i.serviceSubcategoryId ?? null,
      name,
      slug,
      description: cleanName(i.description).slice(0, 1000),
      priceUsdtCents: onRequest ? 1 : Math.max(1, toUsdtCents(i.price)),
      priceOnRequest: onRequest,
      hot: Boolean(i.hotItem),
      sortOrder: i.sortOrder ?? 0,
      addons: addonsFrom(i.description),
      maxQuantity: maxQuantityFrom(i.description),
    };
  });
}
