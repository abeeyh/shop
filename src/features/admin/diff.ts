import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)

const IGNORED = new Set(["updatedAt", "createdAt"]);

// campos que mudaram, para a lista de auditoria
export function changedFields(before: Record<string, unknown> | null, after: Record<string, unknown>) {
  return Object.keys(after)
    .filter((k) => !IGNORED.has(k) && JSON.stringify(before?.[k]) !== JSON.stringify(after[k]))
    .map((k) => ({ field: k, from: before ? before[k] : undefined, to: after[k] }));
}
