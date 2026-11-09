// RF-03 (doc 17): busca e filtros das listas do catálogo, pelos parâmetros da URL (?q=&cat=&status=).
// shortcut: filtra em memória (a lista do admin já vem inteira, ~200 produtos); paginar no banco se passar de ~2000
export type ListFilter = { q: string; cat: string; status: "" | "active" | "inactive" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseListFilter(sp: Record<string, string | string[] | undefined>): ListFilter {
  const status = one(sp.status);
  return {
    q: one(sp.q).trim().slice(0, 80),
    cat: /^[0-9a-f-]{36}$/.test(one(sp.cat)) ? one(sp.cat) : "",
    status: status === "active" || status === "inactive" ? status : "",
  };
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function applyListFilter<
  R extends { name: string; slug: string; active: boolean; categoryId?: string },
>(rows: R[], f: ListFilter): R[] {
  const q = norm(f.q);
  return rows.filter(
    (r) =>
      (!q || norm(r.name).includes(q) || r.slug.includes(q)) &&
      (!f.cat || r.categoryId === f.cat) &&
      (!f.status || r.active === (f.status === "active")),
  );
}
