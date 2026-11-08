import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { GradientCard } from "@/components/molecules/GradientCard";
import { SignUpForm } from "@/features/account";

export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/cadastro">): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: (await getTranslations({ locale, namespace: "Account" }))("signup.title"),
    robots: { index: false },
  };
}

// RN-107: cadastro opcional — comprar continua sem conta (RN-01)
export default async function SignUpPage({ params }: PageProps<"/[locale]/cadastro">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Account" });
  return (
    <div className="mx-auto grid w-full max-w-md gap-6 px-4 py-12">
      <h1 className="font-heading text-[clamp(1.75rem,4vw,2.5rem)] font-bold text-heading">
        {t("signup.title")}
      </h1>
      <p className="text-muted-foreground">{t("signup.intro")}</p>
      <GradientCard tone="solid">
        <SignUpForm
          locale={locale}
          labels={{
            email: t("email"),
            password: t("password"),
            hint: t("signup.passwordHint"),
            submit: t("signup.submit"),
          }}
          errors={{
            invalid: t("errors.signupInvalid"),
            limited: t("errors.limited"),
            pwned: t("errors.pwned"),
            exists: t("errors.exists"),
          }}
        />
      </GradientCard>
      <p className="text-sm">
        {t("signup.hasAccount")}{" "}
        <Link href={`/${locale}/entrar`} className="font-semibold text-link hover:underline">
          {t("login.title")}
        </Link>
      </p>
    </div>
  );
}
