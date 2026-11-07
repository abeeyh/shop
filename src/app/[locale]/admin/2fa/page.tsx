import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { GradientCard } from "@/components/molecules/GradientCard";
import { getStaff } from "@/features/auth/staff";
import { TwoFactorSetup } from "@/features/auth/components/AuthForms";

export const instant = false;

// RN-02 (#116): ativar o 2FA é opcional — a pessoa chega aqui pelo link "2FA" do painel
export default async function TwoFactorPage({ params }: PageProps<"/[locale]/admin/2fa">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const staff = await getStaff();
  if (!staff) redirect(`/${locale}/admin/entrar`);
  if (staff.twoFactor) redirect(`/${locale}/admin`);
  const t = await getTranslations({ locale, namespace: "Admin" });
  return (
    <main className="mx-auto grid w-full max-w-md gap-6 px-4 py-20">
      <h1 className="font-heading text-3xl font-bold text-heading">{t("setup.title")}</h1>
      <p className="text-muted-foreground">{t("setup.intro")}</p>
      <GradientCard tone="solid">
        <TwoFactorSetup
          locale={locale}
          labels={{
            password: t("setup.password"),
            start: t("setup.start"),
            secret: t("setup.secret"),
            backupCodes: t("setup.backupCodes"),
            code: t("setup.code"),
            confirm: t("setup.confirm"),
          }}
          errors={{ invalid: t("errors.invalid"), limited: t("errors.limited") }}
        />
      </GradientCard>
    </main>
  );
}
