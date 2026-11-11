import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";
import { buttonVariants } from "@/components/atoms/Button";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { EmptyState } from "@/components/molecules/EmptyState";
import { ListTable } from "@/components/molecules/ListTable";
import { PageHeader } from "@/components/molecules/PageHeader";
import { ListFilters } from "@/features/admin/components/ListFilters";
import { RowActions } from "@/features/admin/components/RowActions";
import { applyListFilter, parseListFilter } from "@/features/admin/filters";
import { filterLabels } from "@/features/admin/labels";
import { listAllTags } from "@/features/admin/queries";
import { requireStaff } from "@/features/auth/staff";

export const instant = false;

// #160: tags do produto (várias por produto; a principal agrupa a página da categoria). RN-72: excluir marca.
export default async function TagsAdmin({ params, searchParams }: PageProps<"/[locale]/admin/tags">) {
  await connection();
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  await requireStaff(locale);
  const filter = parseListFilter(sp);
  const [t, rows] = await Promise.all([getTranslations({ locale, namespace: "Admin" }), listAllTags()]);
  const shown = applyListFilter(rows, filter);
  const base = `/${locale}/admin/tags`;
  const create = (
    <Link href={`${base}/novo`} className={buttonVariants({ size: "sm" })}>
      {t("form.newTag")}
    </Link>
  );

  return (
    <>
      <PageHeader title={t("nav.tags")} description={t("crud.count", { n: shown.length })} actions={create} />
      <ListFilters base={base} filter={filter} labels={filterLabels(t)} />
      {shown.length ? (
        <ListTable>
          <thead>
            <tr>
              <th>{t("fields.name")}</th>
              <th>{t("fields.sortOrder")}</th>
              <th>{t("table.products")}</th>
              <th>{t("table.status")}</th>
              <th>
                <span className="sr-only">{t("crud.actions")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
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
                <td data-label={t("fields.sortOrder")}>{r.sortOrder}</td>
                <td data-label={t("table.products")}>{r.products}</td>
                <td data-label={t("table.status")}>
                  <StatusBadge tone={r.active ? "success" : "neutral"}>
                    {r.active ? t("table.active") : t("table.inactive")}
                  </StatusBadge>
                </td>
                <td>
                  <RowActions
                    entity="tag"
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
        <EmptyState
          title={rows.length ? t("crud.noMatch") : t("crud.empty")}
          action={rows.length ? undefined : create}
        />
      )}
    </>
  );
}
