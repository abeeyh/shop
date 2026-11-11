import { getTranslations, setRequestLocale } from "next-intl/server";
import { connection } from "next/server";
import { Input, Textarea } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { FormSection } from "@/components/molecules/FormSection";
import { saveCategory } from "@/features/admin/actions";
import { EntityFormPage } from "@/features/admin/components/EntityFormPage";
import { Field, StatusSection } from "@/features/admin/fields";
import type { AdminT } from "@/features/admin/labels";
import { pickRow } from "@/features/admin/pick-row";
import { listAllCategories } from "@/features/admin/queries";
import { KINDS } from "@/features/admin/schemas";
import { requireStaff } from "@/features/auth/staff";

export const instant = false;

type Row = Awaited<ReturnType<typeof listAllCategories>>[number];

const EMPTY = { name: "", slug: "", kind: "gold", description: "", sortOrder: 0, active: true };

function Main({ edit, t }: { edit?: Row; t: AdminT }) {
  const v = { ...EMPTY, ...edit };
  return (
    <FormSection title={t("form.sec.info")} hint={t("form.sec.infoHint")}>
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
      <Field label={t("fields.description")}>
        <Textarea name="description" maxLength={500} defaultValue={v.description} />
      </Field>
    </FormSection>
  );
}

function Aside({ edit, t }: { edit?: Row; t: AdminT }) {
  const v = { ...EMPTY, ...edit };
  return (
    <>
      <FormSection title={t("form.sec.display")} hint={t("form.sec.displayHint")}>
        <Field label={t("fields.sortOrder")}>
          <Input name="sortOrder" type="number" min={0} max={999} defaultValue={v.sortOrder} />
        </Field>
        <Field label={t("fields.imageUrl")}>
          <Input name="imageUrl" type="url" defaultValue={edit?.imageUrl ?? ""} />
        </Field>
      </FormSection>
      <StatusSection t={t} active={v.active} />
    </>
  );
}

// RN-13, RN-72. /novo = criar, /<id> = editar
export default async function CategoryForm({ params }: PageProps<"/[locale]/admin/categorias/[id]">) {
  await connection();
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireStaff(locale);
  const [t, rows] = await Promise.all([getTranslations({ locale, namespace: "Admin" }), listAllCategories()]);
  const edit = pickRow(rows, id);

  return (
    <EntityFormPage
      entity="category"
      action={saveCategory}
      title={edit ? t("form.edit", { name: edit.name }) : t("form.newCategory")}
      back={{ href: `/${locale}/admin/categorias`, label: t("nav.categories") }}
      t={t}
      locale={locale}
      edit={edit}
      main={<Main edit={edit} t={t} />}
      aside={<Aside edit={edit} t={t} />}
    />
  );
}
