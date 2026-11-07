import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)

// RN-95: número de cartão (Luhn) e frase-semente de carteira são mascarados ANTES de gravar
// (docs/09 "Nunca": a loja não guarda dado de cartão nem chave de carteira).

function luhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

// 13–19 dígitos, com espaço ou hífen entre os grupos
const CARD = /\b(?:\d[ -]?){12,18}\d\b/g;
// 12 a 24 palavras minúsculas seguidas (formato de frase BIP-39)
const SEED = /\b(?:[a-z]{3,8}\s+){11,23}[a-z]{3,8}\b/g;

export const CARD_MASK = "[cartão removido]";
export const SEED_MASK = "[frase-semente removida]";

export function maskSensitive(text: string): { text: string; masked: boolean } {
  let masked = false;
  const out = text
    .replace(CARD, (m) => {
      const digits = m.replace(/\D/g, "");
      if (digits.length < 13 || !luhn(digits)) return m;
      masked = true;
      return CARD_MASK;
    })
    .replace(SEED, () => {
      masked = true;
      return SEED_MASK;
    });
  return { text: out, masked };
}
