import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";
import { buttonVariants } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { EmptyState } from "@/components/molecules/EmptyState";
import { PageHeader } from "@/components/molecules/PageHeader";
import { saveTag } from "@/features/admin/actions";
import { ActionForm } from "@/features/admin/components/ActionForm";
import { DeleteEntity } from "@/features/admin/components/DeleteEntity";
import { ListFilters } from "@/features/admin/components/ListFilters";
import { RouteDrawer } from "@/features/admin/components/RouteDrawer";
import { Check, Field, tableCls } from "@/features/admin/fields";
import { applyListFilter, parseListFilter } from "@/features/admin/filters";
import { crudLabels, deleteLabels, filterLabels, formErrors } from "@/features/admin/labels";
import { listAllTags } from "@/features/admin/queries";
import { requireStaff } from "@/features/auth/staff";

export const instant = false;

type T = Awaited<ReturnType<typeof getTranslations<"Admin">>>;
type Row = Awaited<ReturnType<typeof listAllTags>>[number];

// valores do formulário (tag nova = vazios)
const tagValues = (edit: Row | undefined) => ({
  id: edit?.id,
  name: edit?.name ?? "",
  slug: edit?.slug ?? "",
  sortOrder: edit?.sortOrder ?? 0,
  active: edit?.active ?? true,
});

// RF-04: gaveta de criar/editar a tag
function Editor({ edit, locale, base, t }: { edit: Row | undefined; locale: string; base: string; t: T }) {
  const c = crudLabels(t);
  const v = tagValues(edit);
  return (
    <RouteDrawer
      title={edit ? t("form.edit", { name: edit.name }) : t("form.newTag")}
      closeHref={base}
      closeLabel={c.close}
    >
      <ActionForm
        key={v.id ?? "new"}
        action={saveTag}
        locale={locale}
        id={v.id}
        submit={t("form.save")}
        saved={t("form.saved")}
        errors={formErrors(t)}
      >
        <div className="grid gap-4">
          <Field label={t("fields.name")}>
            <Input name="name" required maxLength={40} defaultValue={v.name} />
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
        <DeleteEntity entity="tag" id={edit.id} locale={locale} labels={deleteLabels(t, edit.name)} />
      ) : null}
    </RouteDrawer>
  );
}

// #160: tags do produto (várias por produto; a principal agrupa a página da categoria). RN-72: excluir marca.
export default async function TagsAdmin({ params, searchParams }: PageProps<"/[locale]/admin/tags">) {
  await connection();
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  await requireStaff(locale);
  const filter = parseListFilter(sp);
  const [t, rows] = await Promise.all([getTranslations({ locale, namespace: "Admin" }), listAllTags()]);
  const edit = rows.find((r) => r.id === sp.editar);
  const shown = applyListFilter(rows, filter);
  const base = `/${locale}/admin/tags`;

  return (
    <>
      <PageHeader
        title={t("nav.tags")}
        description={t("crud.count", { n: shown.length })}
        actions={
          <Link href={`${base}?novo=1`} scroll={false} className={buttonVariants({ size: "sm" })}>
            {t("form.newTag")}
          </Link>
        }
      />
      <ListFilters base={base} filter={filter} labels={filterLabels(t)} />
      {shown.length ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className={tableCls}>
            <thead>
              <tr>
                <th>{t("fields.name")}</th>
                <th>{t("fields.sortOrder")}</th>
                <th>{t("table.products")}</th>
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
                  <td>{r.sortOrder}</td>
                  <td>{r.products}</td>
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
      {edit || sp.novo === "1" ? <Editor edit={edit} locale={locale} base={base} t={t} /> : null}
    </>
  );
}
