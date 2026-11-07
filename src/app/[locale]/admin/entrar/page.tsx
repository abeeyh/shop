import { getTranslations, setRequestLocale } from "next-intl/server";
import { GradientCard } from "@/components/molecules/GradientCard";
import { LoginForm } from "@/features/auth/components/AuthForms";

export default async function AdminLoginPage({ params }: PageProps<"/[locale]/admin/entrar">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Admin" });
  return (
    <main className="mx-auto grid w-full max-w-md gap-6 px-4 py-20">
      <h1 className="font-heading text-3xl font-bold text-heading">{t("login.title")}</h1>
      <GradientCard tone="solid">
        <LoginForm
          locale={locale}
          labels={{ email: t("login.email"), password: t("login.password"), submit: t("login.submit") }}
          errors={{ invalid: t("errors.invalid"), limited: t("errors.limited") }}
        />
      </GradientCard>
    </main>
  );
}
