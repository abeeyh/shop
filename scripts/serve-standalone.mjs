// Sobe o build standalone (pnpm build) como em produção: copia public/ e .next/static/ para dentro
// de .next/standalone (o Next não copia sozinho — docs do output "standalone") e inicia o server.js.
import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const dir = resolve(".next/standalone");
if (!existsSync(resolve(dir, "server.js"))) {
  console.error("Rode `pnpm build` antes.");
  process.exit(1);
}
cpSync("public", resolve(dir, "public"), { recursive: true });
cpSync(".next/static", resolve(dir, ".next/static"), { recursive: true });
process.chdir(dir);
await import(pathToFileURL(resolve(dir, "server.js")).href);
