import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)

// RN-95: número de cartão (Luhn) e frase-semente de carteira são mascarados ANTES de gravar
// (docs/09 "Nunca": a loja não guarda dado de cartão nem chave de carteira). Na dúvida, mascara.

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

// algum trecho de 13–19 dígitos seguidos (sem separadores) passa no Luhn?
function hasCard(digits: string): boolean {
  for (let len = 13; len <= 19; len++)
    for (let i = 0; i + len <= digits.length; i++) if (luhn(digits.slice(i, i + len))) return true;
  return false;
}

// sequência de dígitos com separadores comuns (espaço, ponto, hífen, barra), colada ou não em letras.
// Pega junto validade e CVV ("4111 1111 1111 1111 12/27 123") — tudo some.
const DIGIT_RUN = /(?<!\d)\d(?:[ .\-/]*\d){12,}(?!\d)/g;
// 12 a 24 palavras (maiúsculas, vírgulas, numeração "1." / "1)") — formato de frase BIP-39.
// shortcut: comparar com a lista BIP-39 reduziria falso positivo; hoje mascara qualquer sequência assim
const WORD = String.raw`(?:\d{1,2}[.)]\s*)?[a-z]{3,8}`;
const SEED = new RegExp(String.raw`\b${WORD}(?:[\s,;.]+${WORD}){11,23}\b`, "gi");

export const CARD_MASK = "[cartão removido]";
export const SEED_MASK = "[frase-semente removida]";

export function maskSensitive(text: string): { text: string; masked: boolean } {
  let masked = false;
  const out = text
    .replace(DIGIT_RUN, (m) => {
      if (!hasCard(m.replace(/\D/g, ""))) return m;
      masked = true;
      return CARD_MASK;
    })
    .replace(SEED, () => {
      masked = true;
      return SEED_MASK;
    });
  return { text: out, masked };
}
