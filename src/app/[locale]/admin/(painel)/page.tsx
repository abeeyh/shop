import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { EmptyState } from "@/components/molecules/EmptyState";
import { LocalTime } from "@/components/molecules/LocalTime";
import { PageHeader } from "@/components/molecules/PageHeader";
import { StatCard } from "@/components/molecules/StatCard";
import { tableCls } from "@/features/admin/fields";
import { adminOverview, supportOverview } from "@/features/admin/overview";
import { listAudit } from "@/features/admin/queries";
import { requireStaff } from "@/features/auth/staff";
import { formatUsdt } from "@/features/catalog";
import { listOrdersForStaff } from "@/features/orders/staff";
import { ORDER_STATUS_TONE } from "@/features/orders/status-tone";
import { canonicalLocale } from "@/i18n/routing";
import { getTimezone } from "@/lib/preferences";

export const instant = false;

// RF-20 (doc 17): resumo do que precisa de alguém agora. Suporte vê a operação; o admin vê também
// faturamento, descontos vencendo e equipe sem 2FA (RN-06).
export default async function AdminHome({ params }: PageProps<"/[locale]/admin">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff(locale, ["admin", "suporte"]);
  const admin = staff.role === "admin";
  const timeZone = await getTimezone();
  const [t, o, ops, money, recent, activity] = await Promise.all([
    getTranslations({ locale, namespace: "Admin" }),
    getTranslations({ locale, namespace: "Order" }),
    supportOverview(),
    admin ? adminOverview(timeZone ?? "UTC") : null,
    listOrdersForStaff(null, 1),
    admin ? listAudit(null, 5) : null,
  ]);
  const base = `/${locale}/admin`;
  const lang = canonicalLocale(locale);
  const when = (d: Date) => <LocalTime iso={d.toISOString()} locale={lang} timeZone={timeZone} />;

  return (
    <>
      <PageHeader
        title={t("dashboard.title", { name: staff.user.name })}
        description={t("dashboard.subtitle")}
      />

      <section aria-label={t("dashboard.now")} className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <StatCard
          label={t("dashboard.ordersToDo")}
          value={ops.ordersToDo}
          href={`${base}/pedidos`}
          alert={ops.ordersToDo > 0}
        />
        <StatCard
          label={t("dashboard.openChats")}
          value={ops.openChats}
          href={`${base}/suporte`}
          alert={ops.openChats > 0}
          hint={
            ops.oldestChat ? (
              <>
                {t("dashboard.oldestChat")} {when(ops.oldestChat)}
              </>
            ) : undefined
          }
        />
        <StatCard
          label={t("dashboard.newReports")}
          value={ops.newReports}
          href={`${base}/reportes`}
          alert={ops.newReports > 0}
        />
        {money ? (
          <>
            <StatCard
              label={t("dashboard.paidToday")}
              value={money.paidToday}
              hint={t("dashboard.revenue", { value: formatUsdt(locale, money.revenueTodayCents) })}
            />
            <StatCard
              label={t("dashboard.endingSoon")}
              value={money.endingSoon}
              href={`${base}/promocoes`}
              alert={money.endingSoon > 0}
            />
            <StatCard
              label={t("dashboard.no2fa")}
              value={money.staffWithout2fa}
              href={`${base}/equipe`}
              alert={money.staffWithout2fa > 0}
            />
          </>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section aria-labelledby="recentes" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="recentes" className="font-heading text-lg font-bold text-heading">
              {t("dashboard.recentOrders")}
            </h2>
            <Link href={`${base}/pedidos?todos=1`} className="text-sm text-link hover:underline">
              {t("dashboard.seeAll")}
            </Link>
          </div>
          {recent.rows.length ? (
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <table className={tableCls}>
                <tbody>
                  {recent.rows.slice(0, 5).map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link
                          href={`${base}/pedidos/${r.id}`}
                          className="font-mono text-link hover:underline"
                        >
                          {r.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td>
                        <StatusBadge tone={ORDER_STATUS_TONE[r.status]}>
                          {o(`statuses.${r.status}`)}
                        </StatusBadge>
                      </td>
                      <td className="text-right font-semibold text-heading">
                        {formatUsdt(locale, r.totalUsdtCents)}
                      </td>
                      <td className="text-right text-muted-foreground">{when(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title={t("dashboard.emptyOrders")} />
          )}
        </section>

        {activity ? (
          <section aria-labelledby="atividade" className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="atividade" className="font-heading text-lg font-bold text-heading">
                {t("dashboard.recentActivity")}
              </h2>
              <Link href={`${base}/auditoria`} className="text-sm text-link hover:underline">
                {t("dashboard.seeAll")}
              </Link>
            </div>
            {activity.rows.length ? (
              <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                {activity.rows.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-4 py-3 text-sm"
                  >
                    <span>
                      <span className="font-semibold text-heading">{a.staffEmail}</span>{" "}
                      <span className="text-muted-foreground">
                        {t(`audit.actions.${a.action}`)} · {t(`audit.entities.${a.entity}`)}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">{when(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title={t("dashboard.emptyActivity")} />
            )}
          </section>
        ) : null}
      </div>
    </>
  );
}
