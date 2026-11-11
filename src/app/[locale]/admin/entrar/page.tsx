import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/organisms/AuthShell";
import { LoginForm } from "@/features/auth/components/AuthForms";

export default async function AdminLoginPage({ params }: PageProps<"/[locale]/admin/entrar">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Admin" });
  return (
    <AuthShell title={t("login.title")} storeHref={`/${locale}`} storeLabel={t("nav.store")}>
      <LoginForm
        locale={locale}
        labels={{ email: t("login.email"), password: t("login.password"), submit: t("login.submit") }}
        errors={{ invalid: t("errors.invalid"), limited: t("errors.limited") }}
      />
    </AuthShell>
  );
}
