import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getStaff, requireStaff } from "@/features/auth/staff";
import { readDoc } from "@/features/docs/docs";

export const instant = false;

// RN-74. shortcut: Markdown mostrado como texto (sem renderizar nem Mermaid) — renderizar exige uma
// dependência nova (decisão de stack, docs/03)
export default async function DocPage({ params }: PageProps<"/[locale]/admin/docs/[slug]">) {
  await connection();
  const { locale, slug } = await params;
  setRequestLocale(locale);
  if (!(await getStaff())) notFound(); // RN-74: visitante e cliente recebem 404, não o login
  await requireStaff(locale, ["admin", "suporte"]);
  const doc = await readDoc(slug);
  if (!doc) notFound();
  return (
    <article className="grid gap-4">
      <h1 className="font-heading text-3xl font-bold text-heading">{doc.title}</h1>
      <pre className="overflow-x-auto rounded-md bg-card p-4 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-foreground">
        {doc.body}
      </pre>
    </article>
  );
}
