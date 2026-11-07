import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { z } from "zod";

export const SORTS = ["relevance", "best", "price-asc", "price-desc"] as const;
export type Sort = (typeof SORTS)[number];
export type RegionFilter = "US" | "EU" | "all";
export const PAGE_SIZE = 24; // RN-103
const MAX_QUERY = 80;

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// campo vazio do formulário ("min=") é "sem filtro", não zero
const money = z
  .preprocess(
    (v) => (v === "" || v === undefined ? undefined : v),
    z.coerce.number().int().min(0).max(1_000_000).optional(),
  )
  .catch(undefined);
const pageNumber = z.coerce.number().int().min(1).max(500).catch(1);

// formulário GET repete o parâmetro (cat=a&cat=b); link de chip usa vírgula (cat=a,b)
function parseCategories(v: string | string[] | undefined, allowed: string[]): string[] {
  const all = (Array.isArray(v) ? v.join(",") : (v ?? "")).split(",");
  return [...new Set(all)].filter((c) => allowed.includes(c));
}

function parseRegion(v: string | undefined, fallback: "US" | "EU"): RegionFilter {
  return v === "US" || v === "EU" || v === "all" ? v : fallback;
}

// relevância só existe com termo de busca
const defaultSort = (q: string): Sort => (q ? "relevance" : "best");
function parseSort(v: string | undefined, q: string): Sort {
  return SORTS.find((s) => s === v && (s !== "relevance" || q)) ?? defaultSort(q);
}

// RN-103: filtros vêm da URL; valor inválido é ignorado (volta ao padrão), nunca derruba a página
export function parseFilters(raw: Raw, defaults: { region: "US" | "EU"; categories: string[] }) {
  const typed = (one(raw.q) ?? "").trim().slice(0, MAX_QUERY);
  const q = typed.length >= 2 ? typed : ""; // RN-100: mínimo de 2 caracteres
  return {
    q,
    tooShort: typed.length === 1,
    categories: parseCategories(raw.cat, defaults.categories),
    region: parseRegion(one(raw.region), defaults.region),
    min: money.parse(one(raw.min)),
    max: money.parse(one(raw.max)),
    available: one(raw.disponivel) === "1",
    sort: parseSort(one(raw.sort), q),
    page: pageNumber.parse(one(raw.page) ?? 1),
  };
}

export type Filters = ReturnType<typeof parseFilters>;

const when = (condition: boolean, value: string) => (condition ? value : undefined);

// URL dos produtos com os filtros (chips, paginação, "limpar") — só o que difere do padrão
export function filtersToQuery(f: Filters, defaultRegion: string, patch: Partial<Filters> = {}): string {
  const v = { ...f, ...patch };
  const entries: [string, string | undefined][] = [
    ["q", when(v.q !== "", v.q)],
    ["cat", when(v.categories.length > 0, v.categories.join(","))],
    ["region", when(v.region !== defaultRegion, v.region)],
    ["min", when(v.min !== undefined, String(v.min))],
    ["max", when(v.max !== undefined, String(v.max))],
    ["disponivel", when(v.available, "1")],
    ["sort", when(v.sort !== defaultSort(v.q), v.sort)],
    ["page", when(v.page > 1, String(v.page))],
  ];
  const s = new URLSearchParams(entries.filter((e): e is [string, string] => e[1] !== undefined)).toString();
  return s ? `?${s}` : "";
}
