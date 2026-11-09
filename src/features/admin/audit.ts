import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { db } from "@/db";
import { auditLog } from "@/db/schema";

export type Entity =
  | "category"
  | "subcategory"
  | "product"
  | "promotion"
  | "coupon"
  | "order"
  | "bug_report"
  | "staff"
  | "support_hours";
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// RN-71: a alteração e o registro de auditoria entram juntos (ou nenhum dos dois)
export async function saveAudited(
  entity: Entity,
  staffId: string,
  id: string | null,
  read: (tx: Tx, id: string) => Promise<object | undefined>,
  write: (tx: Tx) => Promise<string | undefined>,
): Promise<void> {
  await db.transaction(async (tx) => {
    const before = id ? await read(tx, id) : undefined;
    const savedId = await write(tx);
    if (!savedId) return; // update de id inexistente: nada mudou
    const after = await read(tx, savedId);
    await tx.insert(auditLog).values({
      staffId,
      entity,
      entityId: savedId,
      action: id ? "update" : "create",
      before: before ?? null,
      after: after ?? {},
    });
  });
}

// RN-72 + RN-71: exclui e registra o "antes" na mesma transação. Item em uso: o banco recusa pela chave
// estrangeira (erro 23503) e nada é gravado — quem chama transforma em "desative em vez de excluir".
export async function deleteAudited(
  entity: Entity,
  staffId: string,
  id: string,
  read: (tx: Tx, id: string) => Promise<object | undefined>,
  remove: (tx: Tx) => Promise<boolean>,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const before = await read(tx, id);
    if (!before || !(await remove(tx))) return false;
    await tx.insert(auditLog).values({ staffId, entity, entityId: id, action: "delete", before, after: {} });
    return true;
  });
}
