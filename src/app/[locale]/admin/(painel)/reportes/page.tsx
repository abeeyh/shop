import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";
import { buttonVariants } from "@/components/atoms/Button";
import { GradientCard } from "@/components/molecules/GradientCard";
import { requireStaff } from "@/features/auth/staff";
import { markResolved } from "@/features/support/actions";
import { listReports } from "@/features/support/queries";

export const instant = false;

type Report = Awaited<ReturnType<typeof listReports>>[number];
type T = Awaited<ReturnType<typeof getTranslations<"Admin">>>;

function ReportCard({ r, t, locale }: { r: Report; t: T; locale: string }) {
  return (
    <GradientCard tone="solid" className="grid gap-2 text-sm">
      <p className="flex flex-wrap justify-between gap-2 text-muted-foreground">
        <span>{r.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC</span>
        <span>{r.status === "novo" ? t("reports.new") : t("reports.resolved")}</span>
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
          <button type="submit" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            {t("reports.resolve")}
          </button>
        </form>
      ) : null}
    </GradientCard>
  );
}

// RN-91 / RN-06: reportes de problema para suporte e admin
export default async function ReportsAdmin({ params, searchParams }: PageProps<"/[locale]/admin/reportes">) {
  await connection();
  const [{ locale }, { todos }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  await requireStaff(locale, ["admin", "suporte"]);
  const all = todos === "1";
  const [t, rows] = await Promise.all([
    getTranslations({ locale, namespace: "Admin" }),
    listReports(all ? null : "novo"),
  ]);
  const base = `/${locale}/admin/reportes`;
  return (
    <>
      <h1 className="font-heading text-3xl font-bold text-heading">{t("nav.reports")}</h1>
      <Link href={all ? base : `${base}?todos=1`} className="text-sm text-link hover:underline">
        {all ? t("reports.onlyNew") : t("orders.all")}
      </Link>
      <ul className="grid gap-4">
        {rows.map((r) => (
          <li key={r.id}>
            <ReportCard r={r} t={t} locale={locale} />
          </li>
        ))}
      </ul>
    </>
  );
}
