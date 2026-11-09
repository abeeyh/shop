import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";
import { Input, Textarea } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { buttonVariants } from "@/components/atoms/Button";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { EmptyState } from "@/components/molecules/EmptyState";
import { PageHeader } from "@/components/molecules/PageHeader";
import { saveCategory } from "@/features/admin/actions";
import { ActionForm } from "@/features/admin/components/ActionForm";
import { DeleteEntity } from "@/features/admin/components/DeleteEntity";
import { RouteDrawer } from "@/features/admin/components/RouteDrawer";
import { Check, Field, tableCls } from "@/features/admin/fields";
import { crudLabels, deleteLabels, formErrors } from "@/features/admin/labels";
import { listAllCategories } from "@/features/admin/queries";
import { KINDS } from "@/features/admin/schemas";
import { requireStaff } from "@/features/auth/staff";

export const instant = false;

const EMPTY = {
  id: "",
  name: "",
  slug: "",
  kind: "gold",
  description: "",
  imageUrl: "",
  sortOrder: 0,
  active: true,
};

// RN-13, RN-70, RN-72 (exclui só o que nunca foi usado), RN-73. Doc 17 §3: lista + gaveta
export default async function CategoriesAdmin({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/categorias">) {
  await connection();
  const [{ locale }, { editar, novo }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  await requireStaff(locale);
  const [t, rows] = await Promise.all([getTranslations({ locale, namespace: "Admin" }), listAllCategories()]);
  const edit = rows.find((r) => r.id === editar);
  const v = { ...EMPTY, ...edit, imageUrl: edit?.imageUrl ?? "" };
  const base = `/${locale}/admin/categorias`;
  const open = !!edit || novo === "1";
  const c = crudLabels(t);

  return (
    <>
      <PageHeader
        title={t("nav.categories")}
        description={t("crud.count", { n: rows.length })}
        actions={
          <Link href={`${base}?novo=1`} scroll={false} className={buttonVariants({ size: "sm" })}>
            {t("form.newCategory")}
          </Link>
        }
      />
      {rows.length ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className={tableCls}>
            <thead>
              <tr>
                <th>{t("fields.name")}</th>
                <th>{t("fields.kind")}</th>
                <th>{t("table.activeProducts")}</th>
                <th>{t("table.status")}</th>
                <th>
                  <span className="sr-only">{t("form.editLink")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="text-heading">
                    {r.name} <span className="text-muted-foreground">/{r.slug}</span>
                  </td>
                  <td>{t(`kinds.${r.kind}`)}</td>
                  <td>{r.activeProducts}</td>
                  <td>
                    <StatusBadge tone={r.active ? "success" : "neutral"}>
                      {r.active ? t("table.active") : t("table.inactive")}
                    </StatusBadge>
                  </td>
                  <td>
                    <Link
                      href={`${base}?editar=${r.id}`}
                      scroll={false}
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
        <EmptyState title={t("crud.empty")} />
      )}
      {open ? (
        <RouteDrawer
          title={edit ? t("form.edit", { name: edit.name }) : t("form.newCategory")}
          closeHref={base}
          closeLabel={c.close}
        >
          <ActionForm
            key={v.id || "new"}
            action={saveCategory}
            locale={locale}
            id={v.id}
            submit={t("form.save")}
            saved={t("form.saved")}
            errors={formErrors(t)}
          >
            <div className="grid gap-4">
              <Field label={t("fields.name")}>
                <Input name="name" required maxLength={60} defaultValue={v.name} />
              </Field>
              <Field label={t("fields.slug")}>
                <Input name="slug" required maxLength={60} defaultValue={v.slug} />
              </Field>
              <Field label={t("fields.kind")}>
                {/* RN-13: o tipo define os campos do pedido; não muda depois de criado */}
                {edit ? (
                  <Input name="kind" readOnly value={edit.kind} />
                ) : (
                  <Select name="kind" defaultValue="gold">
                    {KINDS.map((k) => (
                      <option key={k} value={k}>
                        {t(`kinds.${k}`)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label={t("fields.sortOrder")}>
                <Input name="sortOrder" type="number" min={0} max={999} defaultValue={v.sortOrder} />
              </Field>
              <Field label={t("fields.imageUrl")}>
                <Input name="imageUrl" type="url" defaultValue={v.imageUrl} />
              </Field>
              <Check label={t("fields.active")} name="active" defaultChecked={v.active} />
            </div>
            <Field label={t("fields.description")}>
              <Textarea name="description" maxLength={500} defaultValue={v.description} />
            </Field>
          </ActionForm>
          {edit ? (
            <DeleteEntity
              entity="category"
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
