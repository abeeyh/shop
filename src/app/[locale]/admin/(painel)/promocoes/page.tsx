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
import { listPromotions } from "@/features/admin/queries";
import { requireStaff } from "@/features/auth/staff";
import { canonicalLocale } from "@/i18n/routing";
import { getTimezone } from "@/lib/preferences";

export const instant = false;

// RN-21 a RN-24: promoções por tempo (datas em UTC no banco, no fuso de quem vê na tela)
export default async function PromotionsAdmin({ params }: PageProps<"/[locale]/admin/promocoes">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  await requireStaff(locale);
  const [t, rows, timeZone] = await Promise.all([
    getTranslations({ locale, namespace: "Admin" }),
    listPromotions(),
    getTimezone(),
  ]);
  const lang = canonicalLocale(locale);
  const now = new Date();
  const base = `/${locale}/admin/promocoes`;
  const create = (
    <Link href={`${base}/novo`} className={buttonVariants({ size: "sm" })}>
      {t("form.newPromotion")}
    </Link>
  );

  return (
    <>
      <PageHeader
        title={t("nav.promotions")}
        description={t("crud.count", { n: rows.length })}
        actions={create}
      />
      {rows.length ? (
        <ListTable>
          <thead>
            <tr>
              <th>{t("fields.name")}</th>
              <th>{t("fields.value")}</th>
              <th>{t("fields.startsAt")}</th>
              <th>{t("fields.endsAt")}</th>
              <th>{t("table.status")}</th>
              <th>
                <span className="sr-only">{t("crud.actions")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td data-label={t("fields.name")}>
                  <Link
                    href={`${base}/${r.id}`}
                    className="font-semibold text-heading hover:text-link hover:underline"
                  >
                    {r.name}
                  </Link>
                </td>
                <td data-label={t("fields.value")}>
                  {r.type === "percent" ? `${r.value}%` : `${valueOf(r)} USDT`}
                </td>
                <td data-label={t("fields.startsAt")} className="md:whitespace-nowrap">
                  <LocalTime iso={r.startsAt.toISOString()} locale={lang} timeZone={timeZone} />
                </td>
                <td data-label={t("fields.endsAt")} className="md:whitespace-nowrap">
                  <LocalTime iso={r.endsAt.toISOString()} locale={lang} timeZone={timeZone} />
                </td>
                <td data-label={t("table.status")}>
                  <StatusBadge tone={DISCOUNT_TONE[discountState(r, now)]}>
                    {t(`crud.window.${discountState(r, now)}`)}
                  </StatusBadge>
                </td>
                <td>
                  <RowActions
                    entity="promotion"
                    id={r.id}
                    name={r.name}
                    href={`${base}/${r.id}`}
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
