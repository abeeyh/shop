import { getTranslations, setRequestLocale } from "next-intl/server";
import { connection } from "next/server";
import { Input, Textarea } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { FormSection } from "@/components/molecules/FormSection";
import { saveProduct } from "@/features/admin/actions";
import { EntityFormPage } from "@/features/admin/components/EntityFormPage";
import { ProductOptionsEditor } from "@/features/admin/components/ProductOptionsEditor";
import { TagPicker } from "@/features/admin/components/TagPicker";
import { Check, Field, StatusSection } from "@/features/admin/fields";
import { optionLabels, type AdminT } from "@/features/admin/labels";
import { pickRow } from "@/features/admin/pick-row";
import { listAllCategories, listAllProducts, listAllTags } from "@/features/admin/queries";
import { requireStaff } from "@/features/auth/staff";

export const instant = false;

const usdt = (cents: number) => (cents / 100).toFixed(2);

const EMPTY = {
  name: "",
  slug: "",
  description: "",
  maxQuantity: 1,
  sortOrder: 0,
  priceOnRequest: false,
  hot: false,
  active: true,
};

type ProductRow = Awaited<ReturnType<typeof listAllProducts>>[number];
type Cats = Awaited<ReturnType<typeof listAllCategories>>;
type Tags = Awaited<ReturnType<typeof listAllTags>>;

// RF-09 a RF-11: valores iniciais do editor visual (produto novo = tudo vazio)
function optionsOf(edit: ProductRow | undefined) {
  return {
    addons: (edit?.addons ?? []).map((a) => ({ name: a.name, percent: String(a.percent) })),
    axes: edit?.optionAxes ?? [],
    variants: (edit?.variants ?? []).map((x) => ({
      options: x.options,
      price: x.priceOnRequest ? "" : usdt(x.priceUsdtCents),
      onRequest: x.priceOnRequest,
      note: x.note,
      included: true,
    })),
  };
}

function InfoSection({ edit, t, cats, tags }: { edit?: ProductRow; t: AdminT; cats: Cats; tags: Tags }) {
  const v = { ...EMPTY, ...edit };
  return (
    <FormSection title={t("form.sec.info")} hint={t("form.sec.infoHint")}>
      <Field label={t("fields.category")}>
        <Select name="categoryId" required defaultValue={edit?.categoryId ?? cats[0]?.id}>
          {cats.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
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
      <Field label={t("fields.description")}>
        <Textarea name="description" maxLength={1000} defaultValue={v.description} />
      </Field>
      <TagPicker
        tags={tags}
        selected={edit?.tagIds ?? []}
        labels={{ primary: t("fields.primaryTag"), others: t("fields.otherTags"), none: t("fields.noTag") }}
      />
    </FormSection>
  );
}

function PricingSection({ edit, t }: { edit?: ProductRow; t: AdminT }) {
  const v = { ...EMPTY, ...edit };
  // com variantes o preço do produto é calculado (menor combinação)
  const price = edit && !edit.priceOnRequest && !edit.optionAxes.length ? usdt(edit.priceUsdtCents) : "";
  return (
    <FormSection title={t("form.sec.pricing")} hint={t("form.sec.pricingHint")}>
      <Field label={t("fields.price")}>
        <Input name="price" inputMode="decimal" defaultValue={price} />
      </Field>
      <Check label={t("fields.priceOnRequest")} name="priceOnRequest" defaultChecked={v.priceOnRequest} />
      <Field label={t("fields.maxQuantity")}>
        <Input name="maxQuantity" type="number" min={1} max={100} defaultValue={v.maxQuantity} />
      </Field>
    </FormSection>
  );
}

function DisplaySection({ edit, t }: { edit?: ProductRow; t: AdminT }) {
  const v = { ...EMPTY, ...edit };
  return (
    <FormSection title={t("form.sec.display")} hint={t("form.sec.displayHint")}>
      <Field label={t("fields.imageUrl")}>
        <Input name="imageUrl" type="url" defaultValue={edit?.imageUrl ?? ""} />
      </Field>
      <Field label={t("fields.sortOrder")}>
        <Input name="sortOrder" type="number" min={0} max={999} defaultValue={v.sortOrder} />
      </Field>
      <Check label={t("fields.hot")} name="hot" defaultChecked={v.hot} />
    </FormSection>
  );
}

// RN-12, RN-19: /novo = criar produto, /<id> = editar. Gold não tem eixos (a unidade vem da categoria, RN-15)
export default async function ProductForm({ params }: PageProps<"/[locale]/admin/produtos/[id]">) {
  await connection();
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireStaff(locale);
  const [t, rows, cats, tags] = await Promise.all([
    getTranslations({ locale, namespace: "Admin" }),
    listAllProducts(),
    listAllCategories(),
    listAllTags(),
  ]);
  const edit = pickRow(rows, id);
  const categoryId = edit?.categoryId ?? cats[0]?.id;

  return (
    <EntityFormPage
      entity="product"
      action={saveProduct}
      title={edit ? t("form.edit", { name: edit.name }) : t("form.newProduct")}
      back={{ href: `/${locale}/admin/produtos`, label: t("nav.products") }}
      t={t}
      locale={locale}
      edit={edit}
      main={
        <>
          <InfoSection edit={edit} t={t} cats={cats} tags={tags} />
          <PricingSection edit={edit} t={t} />
          <FormSection title={t("form.sec.options")} hint={t("form.sec.optionsHint")}>
            <ProductOptionsEditor
              {...optionsOf(edit)}
              gold={cats.find((c) => c.id === categoryId)?.kind === "gold"}
              labels={optionLabels(t)}
            />
          </FormSection>
        </>
      }
      aside={
        <>
          <DisplaySection edit={edit} t={t} />
          <StatusSection t={t} active={edit ? edit.active : true} />
        </>
      }
    />
  );
}
