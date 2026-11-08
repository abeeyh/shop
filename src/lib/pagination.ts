// Paginação do admin no banco (#88): página da URL validada; inválida volta para a 1
export const ADMIN_PAGE_SIZE = 50;
const MAX_PAGE = 10_000; // OFFSET enorme vira varredura longa

export function pageParam(v: string | string[] | undefined): number {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n >= 1 && n <= MAX_PAGE ? n : 1;
}

export const pageCount = (total: number, size = ADMIN_PAGE_SIZE) => Math.max(1, Math.ceil(total / size));

// cursor da auditoria: "<ISO em microssegundos>_<uuid>" do último item mostrado (o banco guarda
// microssegundos; Date do JS só tem milissegundos e pularia linhas). Inválido = primeira página.
const CURSOR =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z)_([0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})$/;
export type Cursor = { at: string; id: string };
export function parseCursor(v: string | string[] | undefined): Cursor | null {
  const m = CURSOR.exec(String(Array.isArray(v) ? v[0] : (v ?? "")));
  if (!m) return null;
  // data que o JS "corrige" (30/02 vira 01/03) o Postgres recusa: exige ida e volta exata
  const d = new Date(m[1]!);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 19) !== m[1]!.slice(0, 19)) return null;
  return { at: m[1]!, id: m[2]! };
}
export const toCursor = (r: { cursorAt: string; id: string }) => `${r.cursorAt}_${r.id}`;
