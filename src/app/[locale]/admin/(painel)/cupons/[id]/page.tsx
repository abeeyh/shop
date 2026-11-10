import { getTranslations, setRequestLocale } from "next-intl/server";
import { connection } from "next/server";
import { Input } from "@/components/atoms/Input";
import { FormSection } from "@/components/molecules/FormSection";
import { saveCoupon } from "@/features/admin/actions";
import { EntityFormPage } from "@/features/admin/components/EntityFormPage";
import { DiscountFields, DiscountSchedule } from "@/features/admin/DiscountFields";
import { Field, StatusSection } from "@/features/admin/fields";
import type { AdminT } from "@/features/admin/labels";
import { pickRow } from "@/features/admin/pick-row";
import { listAllCategories, listAllProducts, listCoupons } from "@/features/admin/queries";
import { requireStaff } from "@/features/auth/staff";

export const instant = false;

type Coupon = Awaited<ReturnType<typeof listCoupons>>[number]["coupon"];

const optional = (n: number | null | undefined) => (n == null ? "" : String(n));

function LimitsSection({ edit, t }: { edit?: Coupon; t: AdminT }) {
  const minOrder = edit?.minOrderUsdtCents ? (edit.minOrderUsdtCents / 100).toFixed(2) : "";
  return (
    <FormSection title={t("form.sec.limits")} hint={t("form.sec.limitsHint")}>
      <Field label={t("fields.maxUses")}>
        <Input name="maxUses" type="number" min={1} defaultValue={optional(edit?.maxUses)} />
      </Field>
      <Field label={t("fields.maxUsesPerEmail")}>
        <Input name="maxUsesPerEmail" type="number" min={1} defaultValue={optional(edit?.maxUsesPerEmail)} />
      </Field>
      <Field label={t("fields.minOrder")}>
        <Input name="minOrder" inputMode="decimal" defaultValue={minOrder} />
      </Field>
    </FormSection>
  );
}

// RN-25 a RN-28: /novo = criar cupom, /<id> = editar
export default async function CouponForm({ params }: PageProps<"/[locale]/admin/cupons/[id]">) {
  await connection();
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireStaff(locale);
  const [t, rows, cats, prods] = await Promise.all([
    getTranslations({ locale, namespace: "Admin" }),
    listCoupons(),
    listAllCategories(),
    listAllProducts(),
  ]);
  const edit = pickRow(
    rows.map((r) => r.coupon),
    id,
  );

  return (
    <EntityFormPage
      entity="coupon"
      action={saveCoupon}
      title={edit ? t("form.edit", { name: edit.code.toUpperCase() }) : t("form.newCoupon")}
      back={{ href: `/${locale}/admin/cupons`, label: t("nav.coupons") }}
      t={t}
      locale={locale}
      edit={edit && { id: edit.id, name: edit.code.toUpperCase() }}
      main={
        <>
          <FormSection title={t("form.sec.info")} hint={t("form.sec.infoHint")}>
            <Field label={t("fields.code")}>
              <Input name="code" required maxLength={40} defaultValue={edit?.code} />
            </Field>
          </FormSection>
          <FormSection title={t("form.sec.discount")} hint={t("form.sec.discountHint")}>
            <DiscountFields t={t} v={edit ?? null} categories={cats} products={prods} />
          </FormSection>
          <LimitsSection edit={edit} t={t} />
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
