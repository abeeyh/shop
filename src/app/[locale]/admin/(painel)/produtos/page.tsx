import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";
import { Input, Textarea } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { GradientCard } from "@/components/molecules/GradientCard";
import { saveProduct } from "@/features/admin/actions";
import { ActionForm } from "@/features/admin/components/ActionForm";
import { Check, Field, tableCls } from "@/features/admin/fields";
import { formErrors } from "@/features/admin/labels";
import { listAllCategories, listAllProducts, listAllSubcategories } from "@/features/admin/queries";
import { requireStaff } from "@/features/auth/staff";
import { formatUsdt } from "@/features/catalog";

export const instant = false;

const usdt = (cents: number) => (cents / 100).toFixed(2);
// RN-17: adicionais no textarea, um por linha ("Armor Stack | 25")
const addonLines = (a: { name: string; percent: number }[]) =>
  a.map((x) => `${x.name} | ${x.percent}`).join("\n");
// #100: eixos e combinações no mesmo formato de texto que o admin digita
const axisLines = (a: { name: string; style: string; values: string[] }[]) =>
  a.map((x) => `${x.name} | ${x.style} | ${x.values.join(", ")}`).join("\n");
const variantLines = (
  axes: { name: string }[],
  list: { options: Record<string, string>; priceUsdtCents: number; priceOnRequest: boolean; note: string }[],
) =>
  list
    .map((v) => {
      const opts = axes.map((a) => `${a.name}=${v.options[a.name] ?? ""}`).join("; ");
      const price = v.priceOnRequest ? "-" : usdt(v.priceUsdtCents);
      return [opts, price, v.note].filter((x, i) => i < 2 || x).join(" | ");
    })
    .join("\n");

type ProductRow = Awaited<ReturnType<typeof listAllProducts>>[number];

// valores iniciais do formulário (novo ou edição)
function formValues(edit: ProductRow | undefined, firstCategory: string) {
  return {
    id: "",
    categoryId: firstCategory,
    name: "",
    slug: "",
    description: "",
    active: true,
    subcategoryId: null as string | null,
    maxQuantity: 1,
    priceOnRequest: false,
    hot: false,
    sortOrder: 0,
    ...edit,
    imageUrl: edit?.imageUrl ?? "",
    ...(edit ? textFields(edit) : { addons: "", optionAxes: "", variants: "", price: "" }),
  };
}

// campos de texto do produto em edição (adicionais, eixos, combinações e preço)
function textFields(edit: ProductRow) {
  return {
    addons: addonLines(edit.addons),
    optionAxes: axisLines(edit.optionAxes),
    variants: variantLines(edit.optionAxes, edit.variants),
    // com variantes o preço do produto é calculado (menor combinação)
    price: !edit.priceOnRequest && !edit.optionAxes.length ? usdt(edit.priceUsdtCents) : "",
  };
}

// RN-12, RN-19, RN-70, RN-72 (sem apagar)
export default async function ProductsAdmin({ params, searchParams }: PageProps<"/[locale]/admin/produtos">) {
  await connection();
  const [{ locale }, { editar }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  await requireStaff(locale);
  const [t, rows, cats, subs] = await Promise.all([
    getTranslations({ locale, namespace: "Admin" }),
    listAllProducts(),
    listAllCategories(),
    listAllSubcategories(),
  ]);
  const edit = rows.find((r) => r.id === editar);
  const v = formValues(edit, cats[0]?.id ?? "");

  const base = `/${locale}/admin/produtos`;

  return (
    <>
      <h1 className="font-heading text-3xl font-bold text-heading">{t("nav.products")}</h1>
      <GradientCard tone="solid" className="grid gap-4">
        <h2 className="font-heading text-xl font-semibold text-heading">
          {edit ? t("form.edit", { name: edit.name }) : t("form.newProduct")}
        </h2>
        <ActionForm
          key={v.id || "new"}
          action={saveProduct}
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
              <Input name="name" required maxLength={80} defaultValue={v.name} />
            </Field>
            <Field label={t("fields.slug")}>
              <Input name="slug" required maxLength={60} defaultValue={v.slug} />
            </Field>
            <Field label={t("fields.subcategory")}>
              <Select name="subcategoryId" defaultValue={v.subcategoryId ?? ""}>
                <option value="">{t("fields.noSubcategory")}</option>
                {subs.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.categoryName} › {x.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("fields.price")}>
              <Input name="price" inputMode="decimal" defaultValue={v.price} />
            </Field>
            <Field label={t("fields.maxQuantity")}>
              <Input name="maxQuantity" type="number" min={1} max={100} defaultValue={v.maxQuantity} />
            </Field>
            <Field label={t("fields.sortOrder")}>
              <Input name="sortOrder" type="number" min={0} max={999} defaultValue={v.sortOrder} />
            </Field>
            <Check
              label={t("fields.priceOnRequest")}
              name="priceOnRequest"
              defaultChecked={v.priceOnRequest}
            />
            <Check label={t("fields.hot")} name="hot" defaultChecked={v.hot} />
            <Field label={t("fields.imageUrl")}>
              <Input name="imageUrl" type="url" defaultValue={v.imageUrl} />
            </Field>
            <Check label={t("fields.active")} name="active" defaultChecked={v.active} />
          </div>
          <Field label={t("fields.description")}>
            <Textarea name="description" maxLength={1000} defaultValue={v.description} />
          </Field>
          <Field label={t("fields.addons")}>
            <Textarea name="addons" maxLength={1000} defaultValue={v.addons} placeholder="Armor Stack | 25" />
          </Field>
          <Field label={t("fields.optionAxes")}>
            <Textarea
              name="optionAxes"
              maxLength={2000}
              defaultValue={v.optionAxes}
              placeholder="Bosses | slider | 2/8, 3/8, 4/8"
            />
          </Field>
          <Field label={t("fields.variants")}>
            <Textarea
              name="variants"
              maxLength={20000}
              rows={8}
              defaultValue={v.variants}
              placeholder="Bosses=2/8 | 39.47 | 2 bosses"
            />
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
              <th>{t("fields.category")}</th>
              <th>{t("fields.price")}</th>
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
                <td>
                  {r.priceOnRequest ? t("fields.priceOnRequest") : formatUsdt(locale, r.priceUsdtCents)}
                  {r.optionAxes.length ? (
                    <span className="text-muted-foreground"> · {r.variants.length}×</span>
                  ) : null}
                </td>
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
