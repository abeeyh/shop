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
import { listAllCategories, listAllProducts } from "@/features/admin/queries";
import { requireStaff } from "@/features/auth/staff";
import { formatUsdt } from "@/features/catalog";

export const instant = false;

// RN-12, RN-19, RN-70, RN-72 (excluir só marca). Doc 11 §8: lista com filtros e ações por linha
export default async function ProductsAdmin({ params, searchParams }: PageProps<"/[locale]/admin/produtos">) {
  await connection();
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  const filter = parseListFilter(sp);
  setRequestLocale(locale);
  await requireStaff(locale);
  const [t, rows, cats] = await Promise.all([
    getTranslations({ locale, namespace: "Admin" }),
    listAllProducts(),
    listAllCategories(),
  ]);
  const shown = applyListFilter(rows, filter); // RF-03
  const base = `/${locale}/admin/produtos`;
  const create = (
    <Link href={`${base}/novo`} className={buttonVariants({ size: "sm" })}>
      {t("form.newProduct")}
    </Link>
  );

  return (
    <>
      <PageHeader
        title={t("nav.products")}
        description={t("crud.count", { n: shown.length })}
        actions={create}
      />
      <ListFilters base={base} filter={filter} categories={cats} labels={filterLabels(t)} />
      {shown.length ? (
        <ListTable>
          <thead>
            <tr>
              <th>{t("fields.name")}</th>
              <th>{t("fields.category")}</th>
              <th>{t("fields.price")}</th>
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
                <td data-label={t("fields.category")}>{r.categoryName}</td>
                <td data-label={t("fields.price")}>
                  <span>
                    {r.priceOnRequest ? t("fields.priceOnRequest") : formatUsdt(locale, r.priceUsdtCents)}
                    {r.optionAxes.length ? (
                      <span className="text-muted-foreground"> · {r.variants.length}×</span>
                    ) : null}
                  </span>
                </td>
                <td data-label={t("table.status")}>
                  <StatusBadge tone={r.active ? "success" : "neutral"}>
                    {r.active ? t("table.active") : t("table.inactive")}
                  </StatusBadge>
                </td>
                <td>
                  <RowActions
                    entity="product"
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
