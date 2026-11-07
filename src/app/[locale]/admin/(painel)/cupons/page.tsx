import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";
import { Input } from "@/components/atoms/Input";
import { GradientCard } from "@/components/molecules/GradientCard";
import { saveCoupon } from "@/features/admin/actions";
import { ActionForm } from "@/features/admin/components/ActionForm";
import { DiscountFields, toUtcInput, valueOf } from "@/features/admin/DiscountFields";
import { Field, tableCls } from "@/features/admin/fields";
import { formErrors } from "@/features/admin/labels";
import { listAllCategories, listAllProducts, listCoupons } from "@/features/admin/queries";
import { requireStaff } from "@/features/auth/staff";

export const instant = false;

const optional = (n: number | null) => (n === null ? "" : String(n));

// RN-25 a RN-28; RN-72: cupom não é apagado, só desativado
export default async function CouponsAdmin({ params, searchParams }: PageProps<"/[locale]/admin/cupons">) {
  await connection();
  const [{ locale }, { editar }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  await requireStaff(locale);
  const [t, rows, cats, prods] = await Promise.all([
    getTranslations({ locale, namespace: "Admin" }),
    listCoupons(),
    listAllCategories(),
    listAllProducts(),
  ]);
  const edit = rows.find((r) => r.coupon.id === editar)?.coupon ?? null;
  const base = `/${locale}/admin/cupons`;
  const v = {
    code: "",
    maxUses: "",
    maxUsesPerEmail: "",
    minOrder: "",
    ...(edit && {
      code: edit.code,
      maxUses: optional(edit.maxUses),
      maxUsesPerEmail: optional(edit.maxUsesPerEmail),
      minOrder: edit.minOrderUsdtCents ? (edit.minOrderUsdtCents / 100).toFixed(2) : "",
    }),
  };

  return (
    <>
      <h1 className="font-heading text-3xl font-bold text-heading">{t("nav.coupons")}</h1>
      <GradientCard tone="solid" className="grid gap-4">
        <h2 className="font-heading text-xl font-semibold text-heading">
          {edit ? t("form.edit", { name: edit.code.toUpperCase() }) : t("form.newCoupon")}
        </h2>
        <ActionForm
          key={edit?.id ?? "new"}
          action={saveCoupon}
          locale={locale}
          id={edit?.id}
          submit={t("form.save")}
          saved={t("form.saved")}
          errors={formErrors(t)}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("fields.code")}>
              <Input name="code" required maxLength={40} defaultValue={v.code} />
            </Field>
            <DiscountFields t={t} v={edit} categories={cats} products={prods} />
            <Field label={t("fields.maxUses")}>
              <Input name="maxUses" type="number" min={1} defaultValue={v.maxUses} />
            </Field>
            <Field label={t("fields.maxUsesPerEmail")}>
              <Input name="maxUsesPerEmail" type="number" min={1} defaultValue={v.maxUsesPerEmail} />
            </Field>
            <Field label={t("fields.minOrder")}>
              <Input name="minOrder" inputMode="decimal" defaultValue={v.minOrder} />
            </Field>
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
              <th>{t("fields.code")}</th>
              <th>{t("fields.value")}</th>
              <th>{t("fields.endsAt")}</th>
              <th>{t("table.uses")}</th>
              <th>{t("table.status")}</th>
              <th>
                <span className="sr-only">{t("form.editLink")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ coupon: c, uses }) => (
              <tr key={c.id}>
                <td className="font-mono text-heading uppercase">{c.code}</td>
                <td>{c.type === "percent" ? `${c.value}%` : `${valueOf(c)} USDT`}</td>
                <td>{toUtcInput(c.endsAt).replace("T", " ")}</td>
                <td>{c.maxUses ? `${uses} / ${c.maxUses}` : uses}</td>
                <td>{c.active ? t("table.active") : t("table.inactive")}</td>
                <td>
                  <Link
                    href={`${base}?editar=${c.id}`}
                    aria-label={`${t("form.editLink")} ${c.code}`}
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
