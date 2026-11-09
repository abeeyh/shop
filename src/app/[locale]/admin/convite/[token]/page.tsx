import { getTranslations, setRequestLocale } from "next-intl/server";
import { connection } from "next/server";
import { AuthShell } from "@/components/organisms/AuthShell";
import { AcceptForm } from "@/features/staff/components/StaffForms";
import { openInvite } from "@/features/staff/queries";

export const instant = false;

// RN-04: quem tem o link do convite cria a própria senha; o 2FA é ativado no primeiro login (RN-02)
export default async function InvitePage({ params }: PageProps<"/[locale]/admin/convite/[token]">) {
  await connection();
  const { locale, token } = await params;
  setRequestLocale(locale);
  const [t, invite] = await Promise.all([
    getTranslations({ locale, namespace: "Admin" }),
    token.length <= 100 ? openInvite(token) : null,
  ]);
  const shell = { title: t("accept.title"), storeHref: `/${locale}`, storeLabel: t("nav.store") };
  // RF-32 (doc 17): convite vencido/usado explica o próximo passo em vez de só dar erro
  if (!invite)
    return (
      <AuthShell {...shell} intro={t("accept.errors.expired")}>
        <p className="text-sm text-muted-foreground">{t("accept.nextStep")}</p>
      </AuthShell>
    );
  return (
    <AuthShell {...shell} intro={t("accept.intro", { email: invite.email })}>
      <AcceptForm
        locale={locale}
        token={token}
        labels={{
          name: t("accept.name"),
          password: t("login.password"),
          confirm: t("accept.confirm"),
          hint: t("accept.hint"),
          submit: t("accept.submit"),
          errors: {
            invalid: t("accept.errors.invalid"),
            mismatch: t("accept.errors.mismatch"),
            pwned: t("accept.errors.pwned"),
            expired: t("accept.errors.expired"),
          },
        }}
      />
    </AuthShell>
  );
}
