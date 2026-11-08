// Regra de senha (#107, decisão do dono em 2026-11-07): 8+ caracteres com maiúscula, minúscula e número,
// para cliente e equipe. Vale no servidor (cadastro, convite, admin:create) — o navegador só ajuda.
// Sem dependências: também é importado por scripts/create-admin.mjs.
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export function isStrongPassword(p: string): boolean {
  return (
    p.length >= PASSWORD_MIN &&
    p.length <= PASSWORD_MAX &&
    /\p{Ll}/u.test(p) && // minúscula (inclui acentuadas)
    /\p{Lu}/u.test(p) && // maiúscula
    /\d/.test(p)
  );
}

// para o atributo pattern do <input> (mesma regra; o servidor confere de novo)
export const PASSWORD_PATTERN = "(?=.*\\p{Ll})(?=.*\\p{Lu})(?=.*\\d).{8,128}";
