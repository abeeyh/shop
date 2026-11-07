import { getTranslations, setRequestLocale } from "next-intl/server";
import { connection } from "next/server";
import { GradientCard } from "@/components/molecules/GradientCard";
import { requireStaff } from "@/features/auth/staff";
import { InviteForm, MemberForm } from "@/features/staff/components/StaffForms";
import { listStaff } from "@/features/staff/queries";
import { LOCALE_LABELS } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export const instant = false;

// RN-04 a RN-06: só admin gerencia a equipe
export default async function TeamAdmin({ params }: PageProps<"/[locale]/admin/equipe">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  await requireStaff(locale);
  const [t, members] = await Promise.all([getTranslations({ locale, namespace: "Admin" }), listStaff()]);
  const langs = routing.locales.map((code) => ({ code, label: LOCALE_LABELS[code] ?? code }));
  const roles = {
    role: t("team.role"),
    admin: t("team.admin"),
    support: t("team.support"),
    languages: t("team.languages"),
  };
  const errors = {
    generic: t("formErrors.generic"),
    email: t("team.errors.email"),
    emailTaken: t("team.errors.emailTaken"),
    self: t("team.errors.self"),
  };

  return (
    <>
      <h1 className="font-heading text-3xl font-bold text-heading">{t("nav.team")}</h1>
      <GradientCard tone="solid" className="grid gap-4">
        <h2 className="font-heading text-xl font-semibold text-heading">{t("team.invite")}</h2>
        <InviteForm
          locale={locale}
          langs={langs}
          labels={{
            ...roles,
            email: t("login.email"),
            submit: t("team.sendInvite"),
            link: t("team.link"),
            errors,
          }}
        />
      </GradientCard>
      <ul className="grid gap-4">
        {members.map((m) => (
          <li key={m.userId}>
            <GradientCard tone="solid" className="grid gap-3">
              <p className="flex flex-wrap justify-between gap-2 text-sm">
                <span className="font-semibold text-heading">{m.email}</span>
                <span className="text-muted-foreground">
                  {m.twoFactor ? t("team.twoFactorOn") : t("team.twoFactorOff")}
                </span>
              </p>
              <MemberForm
                locale={locale}
                member={m}
                langs={langs}
                labels={{
                  ...roles,
                  active: t("fields.active"),
                  save: t("form.save"),
                  saved: t("form.saved"),
                  errors,
                }}
              />
            </GradientCard>
          </li>
        ))}
      </ul>
    </>
  );
}
