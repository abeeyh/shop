import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";
import { buttonVariants } from "@/components/atoms/Button";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { EmptyState } from "@/components/molecules/EmptyState";
import { ListTable } from "@/components/molecules/ListTable";
import { PageHeader } from "@/components/molecules/PageHeader";
import { RowActions } from "@/features/admin/components/RowActions";
import { listAllCategories } from "@/features/admin/queries";
import { requireStaff } from "@/features/auth/staff";

export const instant = false;

// RN-13, RN-70, RN-72 (excluir só marca), RN-73. Doc 11 §8: lista com ações por linha; criar/editar em página própria
export default async function CategoriesAdmin({ params }: PageProps<"/[locale]/admin/categorias">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  await requireStaff(locale);
  const [t, rows] = await Promise.all([getTranslations({ locale, namespace: "Admin" }), listAllCategories()]);
  const base = `/${locale}/admin/categorias`;
  const create = (
    <Link href={`${base}/novo`} className={buttonVariants({ size: "sm" })}>
      {t("form.newCategory")}
    </Link>
  );

  return (
    <>
      <PageHeader
        title={t("nav.categories")}
        description={t("crud.count", { n: rows.length })}
        actions={create}
      />
      {rows.length ? (
        <ListTable>
          <thead>
            <tr>
              <th>{t("fields.name")}</th>
              <th>{t("fields.kind")}</th>
              <th>{t("table.activeProducts")}</th>
              <th>{t("table.status")}</th>
              <th>
                <span className="sr-only">{t("crud.actions")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td data-label={t("fields.name")}>
                  <span>
                    <Link
                      href={`${base}/${r.id}`}
                      className="font-semibold text-heading hover:text-link hover:underline"
                    >
                      {r.name}
                    </Link>{" "}
                    <span className="text-muted-foreground">/{r.slug}</span>
                  </span>
                </td>
                <td data-label={t("fields.kind")}>{t(`kinds.${r.kind}`)}</td>
                <td data-label={t("table.activeProducts")}>{r.activeProducts}</td>
                <td data-label={t("table.status")}>
                  <StatusBadge tone={r.active ? "success" : "neutral"}>
                    {r.active ? t("table.active") : t("table.inactive")}
                  </StatusBadge>
                </td>
                <td>
                  <RowActions
                    entity="category"
                    id={r.id}
                    name={r.name}
                    href={`${base}/${r.id}`}
                    locale={locale}
                    t={t}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </ListTable>
      ) : (
        <EmptyState title={t("crud.empty")} action={create} />
      )}
    </>
  );
}
