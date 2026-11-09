import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";
import { Input, Textarea } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { buttonVariants } from "@/components/atoms/Button";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { EmptyState } from "@/components/molecules/EmptyState";
import { PageHeader } from "@/components/molecules/PageHeader";
import { saveProduct } from "@/features/admin/actions";
import { ActionForm } from "@/features/admin/components/ActionForm";
import { DeleteEntity } from "@/features/admin/components/DeleteEntity";
import { RouteDrawer } from "@/features/admin/components/RouteDrawer";
import { Check, Field, tableCls } from "@/features/admin/fields";
import { crudLabels, deleteLabels, filterLabels, formErrors } from "@/features/admin/labels";
import { ListFilters } from "@/features/admin/components/ListFilters";
import { applyListFilter, parseListFilter } from "@/features/admin/filters";
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

type T = Awaited<ReturnType<typeof getTranslations<"Admin">>>;

// RF-04: gaveta larga com o formulário do produto (fora da página: a página fica simples)
function Editor(p: {
  edit: Awaited<ReturnType<typeof listAllProducts>>[number] | undefined;
  locale: string;
  base: string;
  t: T;
  cats: Awaited<ReturnType<typeof listAllCategories>>;
  subs: Awaited<ReturnType<typeof listAllSubcategories>>;
}) {
  const { edit, locale, base, t, cats, subs } = p;
  const v = formValues(edit, cats[0]?.id ?? "");
  const c = crudLabels(t);
  return (
    <RouteDrawer
      title={edit ? t("form.edit", { name: edit.name }) : t("form.newProduct")}
      closeHref={base}
      closeLabel={c.close}
      wide
    >
      <ActionForm
        key={v.id || "new"}
        action={saveProduct}
        locale={locale}
        id={v.id}
        submit={t("form.save")}
        saved={t("form.saved")}
        errors={formErrors(t)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
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
          <Check label={t("fields.priceOnRequest")} name="priceOnRequest" defaultChecked={v.priceOnRequest} />
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
        <DeleteEntity entity="product" id={edit.id} locale={locale} labels={deleteLabels(t, edit.name)} />
      ) : null}
    </RouteDrawer>
  );
}

// RN-12, RN-19, RN-70, RN-72 (exclui só o que nunca foi vendido). Doc 17 §3: lista com filtros + gaveta
export default async function ProductsAdmin({ params, searchParams }: PageProps<"/[locale]/admin/produtos">) {
  await connection();
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  const { editar, novo } = sp;
  const filter = parseListFilter(sp);
  setRequestLocale(locale);
  await requireStaff(locale);
  const [t, rows, cats, subs] = await Promise.all([
    getTranslations({ locale, namespace: "Admin" }),
    listAllProducts(),
    listAllCategories(),
    listAllSubcategories(),
  ]);
  const edit = rows.find((r) => r.id === editar);
  const shown = applyListFilter(rows, filter); // RF-03

  const base = `/${locale}/admin/produtos`;

  const open = !!edit || novo === "1";

  return (
    <>
      <PageHeader
        title={t("nav.products")}
        description={t("crud.count", { n: shown.length })}
        actions={
          <Link href={`${base}?novo=1`} scroll={false} className={buttonVariants({ size: "sm" })}>
            {t("form.newProduct")}
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
                <th>{t("fields.price")}</th>
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
                  <td>
                    {r.priceOnRequest ? t("fields.priceOnRequest") : formatUsdt(locale, r.priceUsdtCents)}
                    {r.optionAxes.length ? (
                      <span className="text-muted-foreground"> · {r.variants.length}×</span>
                    ) : null}
                  </td>
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
      {open ? <Editor edit={edit} locale={locale} base={base} t={t} cats={cats} subs={subs} /> : null}
    </>
  );
}
