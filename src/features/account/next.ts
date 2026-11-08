// #130: depois de entrar/cadastrar/sair, volta para a página em que a pessoa estava (?voltar=). Só aceita
// caminho interno da loja no idioma atual: nada de "//site.com", "https://…" ou "\\" (open redirect —
// docs/09). Qualquer outra coisa = null (quem chama usa o destino padrão).
export function safeNext(next: unknown, locale: string): string | null {
  if (typeof next !== "string" || next.length > 300) return null;
  if (!/^\/[\w\-./%?=&]*$/.test(next) || next.includes("//") || next.includes("\\")) return null;
  const prefix = `/${locale}`;
  if (next !== prefix && !next.startsWith(`${prefix}/`) && !next.startsWith(`${prefix}?`)) return null;
  // voltar para o próprio login/cadastro não faz sentido
  if (/^\/[\w-]+\/(entrar|cadastro)(\/|\?|$)/.test(next)) return null;
  return next;
}
