import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)

export const normalizeCode = (code: string) => code.trim().toLowerCase(); // RN-25: sem diferenciar maiúsculas

// RN-25: limite por cliente conta o mesmo endereço com "+tag" ou pontos do Gmail como um só.
// shortcut: sem conta/verificação de e-mail o limite por cliente é só uma barreira leve (docs/09)
export function canonicalEmail(email: string): string {
  const [user = "", domain = ""] = email.trim().toLowerCase().split("@");
  const base = user.split("+")[0]!;
  const gmail = domain === "gmail.com" || domain === "googlemail.com";
  return `${gmail ? base.replaceAll(".", "") : base}@${gmail ? "gmail.com" : domain}`;
}
