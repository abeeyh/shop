import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { EmptyState } from "@/components/molecules/EmptyState";
import { LocalTime } from "@/components/molecules/LocalTime";
import { PageHeader } from "@/components/molecules/PageHeader";
import { tableCls } from "@/features/admin/fields";
import { requireStaff } from "@/features/auth/staff";
import { listQueue } from "@/features/support/chat";
import { AutoRefresh } from "@/features/support/components/AutoRefresh";
import { sortQueue } from "@/features/support/rules";
import { LOCALE_LABELS } from "@/i18n/navigation";
import { canonicalLocale } from "@/i18n/routing";
import { getTimezone } from "@/lib/preferences";

export const instant = false;

// RN-93/RN-98: fila por chegada, primeiro nos idiomas do atendente. RF-23 (doc 17): contagem, estado
// vazio, última mensagem, responsável e idioma por extenso.
export default async function SupportQueue({ params }: PageProps<"/[locale]/admin/suporte">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff(locale, ["admin", "suporte"]);
  const [t, rows, timeZone] = await Promise.all([
    getTranslations({ locale, namespace: "Admin" }),
    listQueue(),
    getTimezone(),
  ]);
  const queue = sortQueue(rows, staff.languages);
  const lang = canonicalLocale(locale);
  const when = (d: Date) => <LocalTime iso={d.toISOString()} locale={lang} timeZone={timeZone} />;
  return (
    <>
      <AutoRefresh seconds={15} />
      <PageHeader title={t("nav.support")} description={t("support.count", { n: queue.length })} />
      {queue.length ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className={tableCls}>
            <thead>
              <tr>
                <th>{t("support.customer")}</th>
                <th>{t("table.status")}</th>
                <th>{t("support.language")}</th>
                <th>{t("support.assignee")}</th>
                <th>{t("support.lastMessage")}</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link
                      href={`/${locale}/admin/suporte/${c.id}`}
                      className="font-semibold text-link hover:underline"
                    >
                      {c.guestName ?? c.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td>
                    <StatusBadge tone={c.status === "aberta" ? "warning" : "info"}>
                      {t(`support.statuses.${c.status}`)}
                    </StatusBadge>
                  </td>
                  <td className="whitespace-nowrap">
                    {LOCALE_LABELS[c.locale] ?? c.locale}
                    {staff.languages.includes(c.locale) ? (
                      <span className="ml-2 text-xs text-gradient-to">{t("support.yourLanguage")}</span>
                    ) : null}
                  </td>
                  <td className="text-muted-foreground">{c.assignee ?? "—"}</td>
                  <td className="whitespace-nowrap text-muted-foreground">{when(c.lastMessageAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title={t("support.empty")} hint={t("support.emptyHint")} />
      )}
    </>
  );
}
