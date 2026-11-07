import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getStaff, requireStaff } from "@/features/auth/staff";
import { listDocs } from "@/features/docs/docs";

export const instant = false;

// RN-74: documentação interna para admin e suporte
export default async function DocsIndex({ params }: PageProps<"/[locale]/admin/docs">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await getStaff())) notFound(); // RN-74: visitante e cliente recebem 404, não o login
  await requireStaff(locale, ["admin", "suporte"]);
  const [t, docs] = await Promise.all([getTranslations({ locale, namespace: "Admin" }), listDocs()]);
  return (
    <>
      <h1 className="font-heading text-3xl font-bold text-heading">{t("nav.docs")}</h1>
      <ul className="grid gap-2">
        {docs.map((d) => (
          <li key={d.slug}>
            <Link href={`/${locale}/admin/docs/${d.slug}`} className="text-link hover:underline">
              {d.title}
            </Link>{" "}
            <span className="font-mono text-xs text-muted-foreground">{d.slug}.md</span>
          </li>
        ))}
      </ul>
    </>
  );
}
