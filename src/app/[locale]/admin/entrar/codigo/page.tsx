import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/organisms/AuthShell";
import { CodeForm } from "@/features/auth/components/AuthForms";

// Segundo passo do login (RN-02): só funciona com o cookie do primeiro passo (Better Auth)
export default async function AdminCodePage({ params }: PageProps<"/[locale]/admin/entrar/codigo">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Admin" });
  return (
    <AuthShell
      title={t("code.title")}
      intro={t("code.hint")}
      storeHref={`/${locale}`}
      storeLabel={t("nav.store")}
    >
      <CodeForm
        locale={locale}
        labels={{ code: t("code.code"), submit: t("code.submit") }}
        errors={{ invalid: t("errors.invalid"), limited: t("errors.limited") }}
      />
    </AuthShell>
  );
}
