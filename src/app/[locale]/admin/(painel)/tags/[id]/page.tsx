import { getTranslations, setRequestLocale } from "next-intl/server";
import { connection } from "next/server";
import { Input } from "@/components/atoms/Input";
import { FormSection } from "@/components/molecules/FormSection";
import { saveTag } from "@/features/admin/actions";
import { EntityFormPage } from "@/features/admin/components/EntityFormPage";
import { Field, StatusSection } from "@/features/admin/fields";
import { pickRow } from "@/features/admin/pick-row";
import { listAllTags } from "@/features/admin/queries";
import { requireStaff } from "@/features/auth/staff";

export const instant = false;

const EMPTY = { name: "", slug: "", sortOrder: 0, active: true };

// #160: /novo = criar tag, /<id> = editar
export default async function TagForm({ params }: PageProps<"/[locale]/admin/tags/[id]">) {
  await connection();
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireStaff(locale);
  const [t, rows] = await Promise.all([getTranslations({ locale, namespace: "Admin" }), listAllTags()]);
  const edit = pickRow(rows, id);
  const v = { ...EMPTY, ...edit };

  return (
    <EntityFormPage
      entity="tag"
      action={saveTag}
      title={edit ? t("form.edit", { name: edit.name }) : t("form.newTag")}
      back={{ href: `/${locale}/admin/tags`, label: t("nav.tags") }}
      t={t}
      locale={locale}
      edit={edit}
      main={
        <FormSection title={t("form.sec.info")} hint={t("form.sec.infoHint")}>
          <Field label={t("fields.name")}>
            <Input name="name" required maxLength={40} defaultValue={v.name} />
          </Field>
          <Field label={t("fields.slug")}>
            <Input name="slug" required maxLength={60} defaultValue={v.slug} />
          </Field>
        </FormSection>
      }
      aside={
        <>
          <FormSection title={t("form.sec.display")} hint={t("form.sec.displayHint")}>
            <Field label={t("fields.sortOrder")}>
              <Input name="sortOrder" type="number" min={0} max={999} defaultValue={v.sortOrder} />
            </Field>
          </FormSection>
          <StatusSection t={t} active={v.active} />
        </>
      }
    />
  );
}
