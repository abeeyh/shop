import { getTranslations, setRequestLocale } from "next-intl/server";
import { connection } from "next/server";
import { GradientCard } from "@/components/molecules/GradientCard";
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
  return (
    <main className="mx-auto grid w-full max-w-md gap-6 px-4 py-20">
      <h1 className="font-heading text-3xl font-bold text-heading">{t("accept.title")}</h1>
      {invite ? (
        <>
          <p className="text-muted-foreground">{t("accept.intro", { email: invite.email })}</p>
          <GradientCard tone="solid">
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
          </GradientCard>
        </>
      ) : (
        <p className="text-error-text">{t("accept.errors.expired")}</p>
      )}
    </main>
  );
}
