import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";
import { buttonVariants } from "@/components/atoms/Button";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { EmptyState } from "@/components/molecules/EmptyState";
import { ListTable } from "@/components/molecules/ListTable";
import { LocalTime } from "@/components/molecules/LocalTime";
import { PageHeader } from "@/components/molecules/PageHeader";
import { RowActions } from "@/features/admin/components/RowActions";
import { DISCOUNT_TONE, discountState } from "@/features/admin/discount-window";
import { valueOf } from "@/features/admin/DiscountFields";
import { listCoupons } from "@/features/admin/queries";
import { requireStaff } from "@/features/auth/staff";
import { canonicalLocale } from "@/i18n/routing";
import { getTimezone } from "@/lib/preferences";

export const instant = false;

// RN-25 a RN-28; RN-72: excluir só marca (o cupom já usado continua nos pedidos)
export default async function CouponsAdmin({ params }: PageProps<"/[locale]/admin/cupons">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  await requireStaff(locale);
  const [t, rows, timeZone] = await Promise.all([
    getTranslations({ locale, namespace: "Admin" }),
    listCoupons(),
    getTimezone(),
  ]);
  const lang = canonicalLocale(locale);
  const now = new Date();
  const base = `/${locale}/admin/cupons`;
  const create = (
    <Link href={`${base}/novo`} className={buttonVariants({ size: "sm" })}>
      {t("form.newCoupon")}
    </Link>
  );

  return (
    <>
      <PageHeader
        title={t("nav.coupons")}
        description={t("crud.count", { n: rows.length })}
        actions={create}
      />
      {rows.length ? (
        <ListTable>
          <thead>
            <tr>
              <th>{t("fields.code")}</th>
              <th>{t("fields.value")}</th>
              <th>{t("fields.endsAt")}</th>
              <th>{t("table.uses")}</th>
              <th>{t("table.status")}</th>
              <th>
                <span className="sr-only">{t("crud.actions")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ coupon: c, uses }) => (
              <tr key={c.id}>
                <td data-label={t("fields.code")}>
                  <Link
                    href={`${base}/${c.id}`}
                    className="font-mono font-semibold text-heading uppercase hover:text-link hover:underline"
                  >
                    {c.code}
                  </Link>
                </td>
                <td data-label={t("fields.value")}>
                  {c.type === "percent" ? `${c.value}%` : `${valueOf(c)} USDT`}
                </td>
                <td data-label={t("fields.endsAt")} className="md:whitespace-nowrap">
                  <LocalTime iso={c.endsAt.toISOString()} locale={lang} timeZone={timeZone} />
                </td>
                <td data-label={t("table.uses")}>{c.maxUses ? `${uses} / ${c.maxUses}` : uses}</td>
                <td data-label={t("table.status")}>
                  <StatusBadge tone={DISCOUNT_TONE[discountState(c, now)]}>
                    {t(`crud.window.${discountState(c, now)}`)}
                  </StatusBadge>
                </td>
                <td>
                  <RowActions
                    entity="coupon"
                    id={c.id}
                    name={c.code.toUpperCase()}
                    href={`${base}/${c.id}`}
                    locale={locale}
                    t={t}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </ListTable>
      ) : (
        <EmptyState title={t("crud.empty")} action={create} />
      )}
    </>
  );
}
