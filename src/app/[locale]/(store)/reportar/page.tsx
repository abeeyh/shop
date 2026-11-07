import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GradientCard } from "@/components/molecules/GradientCard";
import { ReportForm } from "@/features/support/components/ReportForm";

export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/reportar">): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: (await getTranslations({ locale, namespace: "Report" }))("title"),
    robots: { index: false },
  };
}

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

// RN-91: reportar problema (página de origem e ID do erro vêm do link)
export default async function ReportPage({ params, searchParams }: PageProps<"/[locale]/reportar">) {
  const [{ locale }, q] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Report" });
  const errorId = one(q.erro).slice(0, 100);
  return (
    <div className="mx-auto grid w-full max-w-xl gap-6 px-4 py-12">
      <h1 className="font-heading text-[clamp(1.75rem,4vw,2.5rem)] font-bold text-heading">{t("title")}</h1>
      <p className="text-muted-foreground">{t("intro")}</p>
      {errorId ? (
        <p className="text-sm">
          {t("errorId")}: <code className="font-mono text-heading">{errorId}</code>
        </p>
      ) : null}
      <GradientCard tone="solid">
        <ReportForm
          locale={locale}
          page={one(q.pagina).slice(0, 300)}
          errorId={errorId}
          labels={{
            description: t("description"),
            email: t("email"),
            emailHint: t("emailHint"),
            submit: t("submit"),
            sent: t("sent"),
            invalid: t("invalid"),
            limited: t("limited"),
          }}
        />
      </GradientCard>
    </div>
  );
}
