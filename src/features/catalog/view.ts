import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { cookies } from "next/headers";

// #166: exibição da lista de produtos — grade (padrão, pedido do dono) ou lista. A URL (?vista=) vence; senão vale a última
// escolha guardada no cookie (não é dado sensível; valor fora da lista = padrão).
export const VIEWS = ["lista", "grade"] as const;
export type ProductView = (typeof VIEWS)[number];

const isView = (v: unknown): v is ProductView => VIEWS.includes(v as ProductView);

export async function productView(param: string | string[] | undefined): Promise<ProductView> {
  const p = Array.isArray(param) ? param[0] : param;
  if (isView(p)) return p;
  const saved = (await cookies()).get("vista")?.value;
  return isView(saved) ? saved : "grade";
}
