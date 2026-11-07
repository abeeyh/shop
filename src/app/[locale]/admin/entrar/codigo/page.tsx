import { getTranslations, setRequestLocale } from "next-intl/server";
import { GradientCard } from "@/components/molecules/GradientCard";
import { CodeForm } from "@/features/auth/components/AuthForms";

// Segundo passo do login (RN-02): só funciona com o cookie do primeiro passo (Better Auth)
export default async function AdminCodePage({ params }: PageProps<"/[locale]/admin/entrar/codigo">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Admin" });
  return (
    <main className="mx-auto grid w-full max-w-md gap-6 px-4 py-20">
      <h1 className="font-heading text-3xl font-bold text-heading">{t("code.title")}</h1>
      <p className="text-muted-foreground">{t("code.hint")}</p>
      <GradientCard tone="solid">
        <CodeForm
          locale={locale}
          labels={{ code: t("code.code"), submit: t("code.submit") }}
          errors={{ invalid: t("errors.invalid"), limited: t("errors.limited") }}
        />
      </GradientCard>
    </main>
  );
}
