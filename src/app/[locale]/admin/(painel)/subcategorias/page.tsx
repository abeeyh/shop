import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { GradientCard } from "@/components/molecules/GradientCard";
import { saveSubcategory } from "@/features/admin/actions";
import { ActionForm } from "@/features/admin/components/ActionForm";
import { Check, Field, tableCls } from "@/features/admin/fields";
import { formErrors } from "@/features/admin/labels";
import { listAllCategories, listAllSubcategories } from "@/features/admin/queries";
import { requireStaff } from "@/features/auth/staff";

export const instant = false;

// #94 / RN-13: subcategorias dentro da categoria (ex.: Raids → Heroic / Normal). RN-72: nunca apaga.
export default async function SubcategoriesAdmin({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/subcategorias">) {
  await connection();
  const [{ locale }, { editar }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  await requireStaff(locale);
  const [t, rows, cats] = await Promise.all([
    getTranslations({ locale, namespace: "Admin" }),
    listAllSubcategories(),
    listAllCategories(),
  ]);
  const edit = rows.find((r) => r.id === editar);
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

  return (
    <>
      <h1 className="font-heading text-3xl font-bold text-heading">{t("nav.subcategories")}</h1>
      <GradientCard tone="solid" className="grid gap-4">
        <h2 className="font-heading text-xl font-semibold text-heading">
          {edit ? t("form.edit", { name: edit.name }) : t("form.newSubcategory")}
        </h2>
        <ActionForm
          key={v.id || "new"}
          action={saveSubcategory}
          locale={locale}
          id={v.id}
          submit={t("form.save")}
          saved={t("form.saved")}
          errors={formErrors(t)}
        >
          <div className="grid gap-4 md:grid-cols-2">
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
          <Link href={base} className="text-sm text-link hover:underline">
            {t("form.cancel")}
          </Link>
        ) : null}
      </GradientCard>

      <div className="overflow-x-auto">
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
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="text-heading">
                  {r.name} <span className="text-muted-foreground">/{r.slug}</span>
                </td>
                <td>{r.categoryName}</td>
                <td>{r.sortOrder}</td>
                <td>{r.active ? t("table.active") : t("table.inactive")}</td>
                <td>
                  <Link
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
    </>
  );
}
