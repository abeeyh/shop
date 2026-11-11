import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { ConfirmSubmit } from "@/components/molecules/ConfirmSubmit";
import { EmptyState } from "@/components/molecules/EmptyState";
import { GradientCard } from "@/components/molecules/GradientCard";
import { LocalTime } from "@/components/molecules/LocalTime";
import { PageHeader } from "@/components/molecules/PageHeader";
import { Pagination } from "@/components/molecules/Pagination";
import { requireStaff } from "@/features/auth/staff";
import { markResolved } from "@/features/support/actions";
import { listReports } from "@/features/support/queries";
import { canonicalLocale } from "@/i18n/routing";
import { pageCount, pageParam } from "@/lib/pagination";
import { getTimezone } from "@/lib/preferences";

export const instant = false;

type Report = Awaited<ReturnType<typeof listReports>>["rows"][number];
type T = Awaited<ReturnType<typeof getTranslations<"Admin">>>;

function ReportCard({
  r,
  t,
  locale,
  timeZone,
}: {
  r: Report;
  t: T;
  locale: string;
  timeZone: string | null;
}) {
  return (
    <GradientCard tone="solid" className="grid gap-2 text-sm">
      <p className="flex flex-wrap justify-between gap-2 text-muted-foreground">
        <LocalTime iso={r.createdAt.toISOString()} locale={canonicalLocale(locale)} timeZone={timeZone} />
        <StatusBadge tone={r.status === "novo" ? "warning" : "success"}>
          {r.status === "novo" ? t("reports.new") : t("reports.resolved")}
        </StatusBadge>
      </p>
      <p className="whitespace-pre-line text-heading">{r.description}</p>
      <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[auto_1fr]">
        <dt className="text-muted-foreground">{t("reports.page")}</dt>
        <dd className="font-mono break-all">{r.page}</dd>
        <dt className="text-muted-foreground">{t("reports.ids")}</dt>
        <dd className="font-mono break-all">
          {r.errorId ?? "—"} · {r.requestId}
        </dd>
        <dt className="text-muted-foreground">{t("reports.context")}</dt>
        <dd>
          {r.locale} · {r.region ?? "—"} · {r.timezone ?? "—"} · {r.release}
        </dd>
        <dt className="text-muted-foreground">{t("reports.browser")}</dt>
        <dd className="break-all">{r.userAgent ?? "—"}</dd>
        <dt className="text-muted-foreground">{t("login.email")}</dt>
        <dd>{r.email ?? "—"}</dd>
      </dl>
      {r.status === "novo" ? (
        <form action={markResolved}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={r.id} />
          <ConfirmSubmit
            label={t("reports.resolve")}
            title={t("reports.resolve")}
            message={t("reports.confirmResolve")}
            confirmLabel={t("confirm.ok")}
            cancelLabel={t("confirm.cancel")}
          />
        </form>
      ) : null}
    </GradientCard>
  );
}

// RN-91 / RN-06: reportes de problema para suporte e admin
export default async function ReportsAdmin({ params, searchParams }: PageProps<"/[locale]/admin/reportes">) {
  await connection();
  const [{ locale }, { todos, pagina }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  await requireStaff(locale, ["admin", "suporte"]);
  const all = todos === "1";
  const page = pageParam(pagina);
  const [t, s, timeZone, { rows, total }] = await Promise.all([
    getTranslations({ locale, namespace: "Admin" }),
    getTranslations({ locale, namespace: "Search" }),
    getTimezone(),
    listReports(all ? null : "novo", page),
  ]);
  const tab = (on: boolean) =>
    `rounded-full px-3 py-1.5 text-sm font-semibold ${on ? "bg-accent text-heading" : "text-muted-foreground hover:text-heading"}`;
  const base = `/${locale}/admin/reportes`;
  const pageHref = (p: number) =>
    `${base}?${new URLSearchParams({ ...(all ? { todos: "1" } : {}), pagina: String(p) })}`;
  return (
    <>
      <PageHeader
        title={t("nav.reports")}
        description={all ? t("reports.countAll", { n: total }) : t("reports.countNew", { n: total })}
      />
      <nav aria-label={t("nav.reports")} className="flex gap-2">
        <Link href={base} aria-current={all ? undefined : "page"} className={tab(!all)}>
          {t("reports.onlyNew")}
        </Link>
        <Link href={`${base}?todos=1`} aria-current={all ? "page" : undefined} className={tab(all)}>
          {t("orders.all")}
        </Link>
      </nav>
      {rows.length ? (
        <ul className="grid gap-4">
          {rows.map((r) => (
            <li key={r.id}>
              <ReportCard r={r} t={t} locale={locale} timeZone={timeZone} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={all ? t("reports.emptyAll") : t("reports.emptyNew")} />
      )}
      <Pagination
        page={page}
        pages={pageCount(total)}
        href={pageHref}
        labels={{ nav: s("pagination"), prev: s("prev"), next: s("next") }}
      />
    </>
  );
}
