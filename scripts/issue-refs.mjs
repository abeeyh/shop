// docs/13 §5: a issue acompanha a promoção dev → hom → main e só fecha em produção.
// Uso: git log --format=%B <intervalo> | node scripts/issue-refs.mjs  → imprime os números, um por linha.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REF = /\b(?:refs|closes|fixes|resolves)\s+#(\d+)/gi;

export function issueRefs(text) {
  const numbers = [...text.matchAll(REF)].map((m) => Number(m[1]));
  return [...new Set(numbers)].sort((a, b) => a - b);
}

// Label que a issue ganha ao chegar na branch, quais saem, e se fecha.
export function labelPlan(branch) {
  const plans = {
    dev: { add: "dev", remove: [], close: false },
    hom: { add: "hom", remove: ["dev"], close: false },
    main: { add: "prod", remove: ["dev", "hom"], close: true },
  };
  return plans[branch] ?? null;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const n of issueRefs(readFileSync(0, "utf8"))) console.log(n);
}
