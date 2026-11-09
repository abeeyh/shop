import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { buttonVariants } from "@/components/atoms/Button";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { EmptyState } from "@/components/molecules/EmptyState";
import { PageHeader } from "@/components/molecules/PageHeader";
import { saveSubcategory } from "@/features/admin/actions";
import { ActionForm } from "@/features/admin/components/ActionForm";
import { DeleteEntity } from "@/features/admin/components/DeleteEntity";
import { RouteDrawer } from "@/features/admin/components/RouteDrawer";
import { Check, Field, tableCls } from "@/features/admin/fields";
import { crudLabels, deleteLabels, filterLabels, formErrors } from "@/features/admin/labels";
import { ListFilters } from "@/features/admin/components/ListFilters";
import { applyListFilter, parseListFilter } from "@/features/admin/filters";
import { listAllCategories, listAllSubcategories } from "@/features/admin/queries";
import { requireStaff } from "@/features/auth/staff";

export const instant = false;

// #94 / RN-13: subcategorias dentro da categoria (ex.: Raids → Heroic / Normal). RN-72: nunca apaga.
export default async function SubcategoriesAdmin({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/subcategorias">) {
  await connection();
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  const { editar, novo } = sp;
  const filter = parseListFilter(sp);
  setRequestLocale(locale);
  await requireStaff(locale);
  const [t, rows, cats] = await Promise.all([
    getTranslations({ locale, namespace: "Admin" }),
    listAllSubcategories(),
    listAllCategories(),
  ]);
  const edit = rows.find((r) => r.id === editar);
  const shown = applyListFilter(rows, filter); // RF-03: filtro por categoria
  const v = {
    id: "",
    categoryId: cats[0]?.id ?? "",
    name: "",
    slug: "",
    sortOrder: 0,
    active: true,
    ...edit,
  };
  const base = `/${locale}/admin/subcategorias`;
  const open = !!edit || novo === "1";
  const c = crudLabels(t);

  return (
    <>
      <PageHeader
        title={t("nav.subcategories")}
        description={t("crud.count", { n: shown.length })}
        actions={
          <Link href={`${base}?novo=1`} scroll={false} className={buttonVariants({ size: "sm" })}>
            {t("form.newSubcategory")}
          </Link>
        }
      />
      <ListFilters base={base} filter={filter} categories={cats} labels={filterLabels(t)} />
      {shown.length ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className={tableCls}>
            <thead>
              <tr>
                <th>{t("fields.name")}</th>
                <th>{t("fields.category")}</th>
                <th>{t("fields.sortOrder")}</th>
                <th>{t("table.status")}</th>
                <th>
                  <span className="sr-only">{t("form.editLink")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td className="text-heading">
                    {r.name} <span className="text-muted-foreground">/{r.slug}</span>
                  </td>
                  <td>{r.categoryName}</td>
                  <td>{r.sortOrder}</td>
                  <td>
                    <StatusBadge tone={r.active ? "success" : "neutral"}>
                      {r.active ? t("table.active") : t("table.inactive")}
                    </StatusBadge>
                  </td>
                  <td>
                    <Link
                      scroll={false}
                      href={`${base}?editar=${r.id}`}
                      aria-label={`${t("form.editLink")} ${r.name}`}
                      className="text-link hover:underline"
                    >
                      {t("form.editLink")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title={rows.length ? t("crud.noMatch") : t("crud.empty")} />
      )}
      {open ? (
        <RouteDrawer
          title={edit ? t("form.edit", { name: edit.name }) : t("form.newSubcategory")}
          closeHref={base}
          closeLabel={c.close}
        >
          <ActionForm
            key={v.id || "new"}
            action={saveSubcategory}
            locale={locale}
            id={v.id}
            submit={t("form.save")}
            saved={t("form.saved")}
            errors={formErrors(t)}
          >
            <div className="grid gap-4">
              <Field label={t("fields.category")}>
                <Select name="categoryId" required defaultValue={v.categoryId}>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("fields.name")}>
                <Input name="name" required maxLength={60} defaultValue={v.name} />
              </Field>
              <Field label={t("fields.slug")}>
                <Input name="slug" required maxLength={60} defaultValue={v.slug} />
              </Field>
              <Field label={t("fields.sortOrder")}>
                <Input name="sortOrder" type="number" min={0} max={999} defaultValue={v.sortOrder} />
              </Field>
              <Check label={t("fields.active")} name="active" defaultChecked={v.active} />
            </div>
          </ActionForm>
          {edit ? (
            <DeleteEntity
              entity="subcategory"
              id={edit.id}
              locale={locale}
              labels={deleteLabels(t, edit.name)}
            />
          ) : null}
        </RouteDrawer>
      ) : null}
    </>
  );
}
