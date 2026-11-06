import { connection } from "next/server";

// Usado pelo Better Stack Uptime (docs/16). Só status, sem versão nem dados internos.
export async function GET() {
  await connection();
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
