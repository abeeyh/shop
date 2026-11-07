import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { cookies } from "next/headers";

export const REGIONS = ["US", "EU"] as const;
export type GameRegion = (typeof REGIONS)[number];
export const REGION_COOKIE = "region";

// RN-14: região escolhida pelo visitante; cookie inválido → padrão (docs/09 caso 11)
export async function getRegion(): Promise<GameRegion> {
  const value = (await cookies()).get(REGION_COOKIE)?.value;
  return REGIONS.find((r) => r === value) ?? "US";
}
