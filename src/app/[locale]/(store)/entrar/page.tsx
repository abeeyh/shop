import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { GradientCard } from "@/components/molecules/GradientCard";
import { CustomerLoginForm, safeNext } from "@/features/account";

export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/entrar">): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: (await getTranslations({ locale, namespace: "Account" }))("login.title"),
    robots: { index: false },
  };
}

// RN-107: login do cliente. "Esqueci a senha" depende de e-mail transacional (#29): ainda não implementado.
export default async function CustomerLoginPage({ params, searchParams }: PageProps<"/[locale]/entrar">) {
  const [{ locale }, q] = await Promise.all([params, searchParams]);
  // #130: página para voltar depois de entrar (validada de novo no servidor — next.ts)
  const next = safeNext(q.voltar, locale) ?? undefined;
  const keep = next ? `?voltar=${encodeURIComponent(next)}` : "";
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Account" });
  return (
    <div className="mx-auto grid w-full max-w-md gap-6 px-4 py-12">
      <h1 className="font-heading text-[clamp(1.75rem,4vw,2.5rem)] font-bold text-heading">
        {t("login.title")}
      </h1>
      <GradientCard tone="solid" className="grid gap-4">
        <CustomerLoginForm
          locale={locale}
          next={next}
          labels={{ email: t("email"), password: t("password"), submit: t("login.submit") }}
          errors={{ invalid: t("errors.invalid"), limited: t("errors.limited"), staff: t("errors.staff") }}
        />
        <p className="text-sm text-muted-foreground">{t("login.forgot")}</p>
      </GradientCard>
      <p className="text-sm">
        {t("login.noAccount")}{" "}
        <Link href={`/${locale}/cadastro${keep}`} className="font-semibold text-link hover:underline">
          {t("signup.title")}
        </Link>
      </p>
    </div>
  );
}
