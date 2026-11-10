import "server-only";
import { notFound } from "next/navigation";

// Rotas /<entidade>/novo e /<entidade>/<id>: "novo" cria; id existente edita; qualquer outra coisa é "não encontrada"
export function pickRow<T extends { id: string }>(rows: T[], id: string): T | undefined {
  if (id === "novo") return undefined;
  const row = rows.find((r) => r.id === id);
  if (!row) notFound();
  return row;
}
