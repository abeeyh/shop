import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";
import { Input, Textarea } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { GradientCard } from "@/components/molecules/GradientCard";
import { saveCategory } from "@/features/admin/actions";
import { ActionForm } from "@/features/admin/components/ActionForm";
import { Check, Field, tableCls } from "@/features/admin/fields";
import { formErrors } from "@/features/admin/labels";
import { listAllCategories } from "@/features/admin/queries";
import { requireStaff } from "@/features/auth/staff";

export const instant = false;

const KINDS = ["gold", "raid", "dungeon"] as const;
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

// RN-13, RN-70, RN-72 (sem apagar), RN-73
export default async function CategoriesAdmin({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/categorias">) {
  await connection();
  const [{ locale }, { editar }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  await requireStaff(locale);
  const [t, rows] = await Promise.all([getTranslations({ locale, namespace: "Admin" }), listAllCategories()]);
  const edit = rows.find((r) => r.id === editar);
  const v = { ...EMPTY, ...edit, imageUrl: edit?.imageUrl ?? "" };
  const base = `/${locale}/admin/categorias`;

  return (
    <>
      <h1 className="font-heading text-3xl font-bold text-heading">{t("nav.categories")}</h1>
      <GradientCard tone="solid" className="grid gap-4">
        <h2 className="font-heading text-xl font-semibold text-heading">
          {edit ? t("form.edit", { name: edit.name }) : t("form.newCategory")}
        </h2>
        <ActionForm
          key={v.id || "new"}
          action={saveCategory}
          locale={locale}
          id={v.id}
          submit={t("form.save")}
          saved={t("form.saved")}
          errors={formErrors(t)}
        >
          <div className="grid gap-4 md:grid-cols-2">
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
