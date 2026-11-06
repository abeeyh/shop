// RN-80 / docs/13 §1: toda chave de en.json existe em todos os idiomas, e nenhuma sobra.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export function flattenKeys(obj, prefix = "") {
  return Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === "object" ? flattenKeys(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );
}

export function diffKeys(base, other) {
  const a = new Set(flattenKeys(base));
  const b = new Set(flattenKeys(other));
  return {
    missing: [...a].filter((k) => !b.has(k)),
    extra: [...b].filter((k) => !a.has(k)),
  };
}

function main() {
  const dir = join(fileURLToPath(new URL(".", import.meta.url)), "..", "messages");
  const read = (f) => JSON.parse(readFileSync(join(dir, f), "utf8"));
  const base = read("en.json");
  let failed = false;
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "en.json")) {
    const { missing, extra } = diffKeys(base, read(file));
    for (const k of missing) console.error(`${file}: falta ${k}`);
    for (const k of extra) console.error(`${file}: sobra ${k}`);
    failed ||= missing.length > 0 || extra.length > 0;
  }
  if (failed) process.exit(1);
  console.log("i18n: todas as chaves presentes nos 6 idiomas");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
