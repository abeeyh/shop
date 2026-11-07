import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

// RN-74: lê docs/ do build (outputFileTracingIncludes) — sem cópia do conteúdo no código
const DIR = join(process.cwd(), "docs");

export type DocEntry = { slug: string; title: string };

const titleOf = (md: string, slug: string) => md.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? slug;

export async function listDocs(): Promise<DocEntry[]> {
  const files = (await readdir(DIR)).filter((f) => f.endsWith(".md")).sort();
  return Promise.all(
    files.map(async (f) => {
      const slug = f.slice(0, -3);
      return { slug, title: titleOf(await readFile(join(DIR, f), "utf8"), slug) };
    }),
  );
}

// slug só vale se estiver na listagem real (sem "../" nem caminho inventado)
export async function readDoc(slug: string): Promise<{ title: string; body: string } | null> {
  const known = (await readdir(DIR)).includes(`${slug}.md`);
  if (!known) return null;
  const body = await readFile(join(DIR, `${slug}.md`), "utf8");
  return { title: titleOf(body, slug), body };
}
