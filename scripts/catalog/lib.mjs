// Regras puras da importação do catálogo (#94) — testadas em lib.test.mjs; import.mjs só grava no banco.
import { productContent } from "../../src/features/catalog/content.ts";

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
      tagRef: i.serviceSubcategoryId ?? null, // #160: vira a tag principal
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

// #100: itens listados em groups.json viram UM produto com variantes (eixos de opção → preço por
// combinação); o resto continua produto único. O produto guarda o menor preço ("a partir de") e só é
// "sob consulta" se todas as variantes forem.
export function toCatalog(items, groups) {
  const singles = toProducts(items);
  const byId = new Map(singles.map((p) => [p.externalId, p]));
  const used = new Set();
  const grouped = groups.map((g) => {
    const variants = g.variants.map((v) => {
      const p = byId.get(v.id);
      if (!p) throw new Error(`groups.json: id ${v.id} (${g.slug}) não existe no arquivo de produtos`);
      if (used.has(v.id)) throw new Error(`groups.json: id ${v.id} está em mais de um grupo`);
      used.add(v.id);
      for (const a of g.axes)
        if (!a.values.includes(v.options[a.name]))
          throw new Error(`groups.json: ${g.slug} id ${v.id} sem valor válido para "${a.name}"`);
      // ordem: pelos valores dos eixos (o slider anda na ordem cadastrada)
      const rank = g.axes.reduce((r, a) => r * 100 + a.values.indexOf(v.options[a.name]), 0);
      return {
        externalId: v.id,
        options: v.options,
        note: (v.note ?? "").slice(0, 160),
        priceUsdtCents: p.priceUsdtCents,
        priceOnRequest: p.priceOnRequest,
        sortOrder: rank,
        _p: p,
      };
    });
    const priced = variants.filter((v) => !v.priceOnRequest);
    const first = variants[0]._p;
    return {
      slug: g.slug,
      name: g.name,
      description: g.description ?? "",
      categoryRef: Number(g.category),
      tagRef: g.tag === null || g.tag === undefined ? null : Number(g.tag),
      optionAxes: g.axes,
      addons: first.addons,
      maxQuantity: first.maxQuantity,
      hot: variants.some((v) => v._p.hot),
      sortOrder: Math.min(...variants.map((v) => v._p.sortOrder)),
      priceUsdtCents: priced.length ? Math.min(...priced.map((v) => v.priceUsdtCents)) : 1,
      priceOnRequest: priced.length === 0,
      variants: variants.map((v) => Object.fromEntries(Object.entries(v).filter(([k]) => k !== "_p"))),
    };
  });
  return { singles: singles.filter((p) => !used.has(p.externalId)), groups: grouped, groupedIds: [...used] };
}

// #136: content.json → { slug: { details, images, faq } }. Um bloco pode servir a vários produtos
// (mesma raid em dificuldades diferentes). Slug inexistente ou repetido, ou imagem sem arquivo = erro.
export function contentBySlug(entries, slugs, fileExists) {
  const out = {};
  for (const { slugs: targets, ...raw } of entries) {
    const content = productContent.parse(raw);
    for (const img of content.images)
      if (!fileExists(img.src)) throw new Error(`content.json: imagem ${img.src} não existe em public/`);
    for (const slug of targets) {
      if (!slugs.has(slug)) throw new Error(`content.json: produto ${slug} não existe no catálogo`);
      if (out[slug]) throw new Error(`content.json: ${slug} aparece em mais de um bloco`);
      out[slug] = content;
    }
  }
  return out;
}
