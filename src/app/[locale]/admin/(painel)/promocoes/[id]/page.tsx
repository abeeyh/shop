import { getTranslations, setRequestLocale } from "next-intl/server";
import { connection } from "next/server";
import { Input } from "@/components/atoms/Input";
import { FormSection } from "@/components/molecules/FormSection";
import { savePromotion } from "@/features/admin/actions";
import { EntityFormPage } from "@/features/admin/components/EntityFormPage";
import { DiscountFields, DiscountSchedule } from "@/features/admin/DiscountFields";
import { Field, StatusSection } from "@/features/admin/fields";
import { pickRow } from "@/features/admin/pick-row";
import { listAllCategories, listAllProducts, listPromotions } from "@/features/admin/queries";
import { requireStaff } from "@/features/auth/staff";

export const instant = false;

// RN-21 a RN-24: /novo = criar promoção, /<id> = editar
export default async function PromotionForm({ params }: PageProps<"/[locale]/admin/promocoes/[id]">) {
  await connection();
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireStaff(locale);
  const [t, rows, cats, prods] = await Promise.all([
    getTranslations({ locale, namespace: "Admin" }),
    listPromotions(),
    listAllCategories(),
    listAllProducts(),
  ]);
  const edit = pickRow(rows, id);

  return (
    <EntityFormPage
      entity="promotion"
      action={savePromotion}
      title={edit ? t("form.edit", { name: edit.name }) : t("form.newPromotion")}
      back={{ href: `/${locale}/admin/promocoes`, label: t("nav.promotions") }}
      t={t}
      locale={locale}
      edit={edit}
      main={
        <>
          <FormSection title={t("form.sec.info")} hint={t("form.sec.infoHint")}>
            <Field label={t("fields.name")}>
              <Input name="name" required maxLength={80} defaultValue={edit?.name} />
            </Field>
          </FormSection>
          <FormSection title={t("form.sec.discount")} hint={t("form.sec.discountHint")}>
            <DiscountFields t={t} v={edit ?? null} categories={cats} products={prods} />
          </FormSection>
        </>
      }
      aside={
        <>
          <FormSection title={t("form.sec.schedule")} hint={t("form.sec.scheduleHint")}>
            <DiscountSchedule t={t} v={edit ?? null} />
          </FormSection>
          <StatusSection t={t} active={edit ? edit.active : true} />
        </>
      }
    />
  );
}
