import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { createHash } from "node:crypto";
import { errorSummary, logger } from "@/lib/logger";

// docs/09: senha vazada recusada (Have I Been Pwned por k-anonimato: só os 5 primeiros caracteres
// do SHA-1 saem do servidor; a senha nunca). Serviço fora do ar não bloqueia o convite (log + segue).
export async function isPwnedPassword(password: string): Promise<boolean> {
  const sha = createHash("sha1").update(password).digest("hex").toUpperCase();
  const [prefix, suffix] = [sha.slice(0, 5), sha.slice(5)];
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "shop-staff-invite" },
      signal: AbortSignal.timeout(3_000),
    });
    if (!res.ok) throw new Error(`hibp ${res.status}`);
    return (await res.text())
      .split("\n")
      .some((l) => l.split(":")[0] === suffix && l.split(":")[1]?.trim() !== "0");
  } catch (err) {
    logger.warn({ event: "auth.hibp_unavailable", ...errorSummary(err) }, "HIBP indisponível");
    return false;
  }
}
