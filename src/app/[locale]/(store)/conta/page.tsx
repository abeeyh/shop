import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { buttonVariants } from "@/components/atoms/Button";
import { GradientCard } from "@/components/molecules/GradientCard";
import {
  CharacterForm,
  DeleteAccountForm,
  getCustomer,
  hasStaffSession,
  listCharacters,
  listCustomerOrders,
  removeCharacter,
  signOut,
} from "@/features/account";
import { formatUsdt } from "@/features/catalog";
import { orderPath } from "@/features/orders";
import { getTimezone } from "@/lib/preferences";

export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/conta">): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: (await getTranslations({ locale, namespace: "Account" }))("title"),
    robots: { index: false },
  };
}

const h2 = "font-heading text-xl font-semibold text-heading";

// RN-107 a RN-109: pedidos da conta, personagens salvos, sair e excluir a conta
export default async function AccountPage({ params }: PageProps<"/[locale]/conta">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const customer = await getCustomer();
  // RN-110: equipe logada vai para o painel; visitante, para o login
  if (!customer) redirect((await hasStaffSession()) ? `/${locale}/admin` : `/${locale}/entrar`);
  const [t, o, b, format, timeZone, chars, orders] = await Promise.all([
    getTranslations({ locale, namespace: "Account" }),
    getTranslations({ locale, namespace: "Order" }),
    getTranslations({ locale, namespace: "Buy" }),
    getFormatter({ locale }),
    getTimezone(),
    listCharacters(customer.id),
    listCustomerOrders(customer.id),
  ]);

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-[clamp(1.75rem,4vw,2.5rem)] font-bold text-heading">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{customer.email}</p>
        </div>
        <form action={signOut}>
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className={buttonVariants({ variant: "ghost" })}>
            {t("signOut")}
          </button>
        </form>
      </div>

      <GradientCard tone="solid" className="grid gap-3">
        <h2 className={h2}>{t("orders.title")}</h2>
        {orders.length ? (
          <ul className="grid gap-2">
            {orders.map((x) => (
              <li key={x.id}>
                <Link
                  href={orderPath(locale, x.id)}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 hover:bg-accent"
                >
                  <span className="text-sm">
                    {format.dateTime(x.createdAt, { dateStyle: "medium", timeZone: timeZone ?? undefined })}
                  </span>
                  <span className="text-sm text-muted-foreground">{o(`statuses.${x.status}`)}</span>
                  <span className="font-heading font-bold text-heading">
                    {formatUsdt(locale, x.totalUsdtCents)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t("orders.empty")}</p>
        )}
      </GradientCard>

      <GradientCard tone="solid" className="grid gap-3">
        <h2 className={h2}>{t("characters.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("characters.intro")}</p>
        {chars.length ? (
          <ul className="grid gap-2">
            {chars.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
              >
                <span className="text-sm text-heading">
                  {c.name} · {c.realm} · {b(c.faction as "alliance" | "horde")}
                </span>
                <form action={removeCharacter}>
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    aria-label={`${t("characters.remove")} ${c.name}`}
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    {t("characters.remove")}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : null}
        <CharacterForm
          labels={{
            realm: b("realm"),
            faction: b("faction"),
            alliance: b("alliance"),
            horde: b("horde"),
            name: b("character"),
            add: t("characters.add"),
          }}
          errors={{
            invalid: t("errors.character"),
            limit: t("errors.characterLimit"),
            duplicate: t("errors.characterDuplicate"),
          }}
        />
      </GradientCard>

      <GradientCard tone="solid" className="grid gap-3">
        <h2 className={h2}>{t("delete.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("delete.intro")}</p>
        <DeleteAccountForm
          locale={locale}
          labels={{ password: t("password"), submit: t("delete.submit") }}
          errors={{ invalid: t("errors.invalid"), limited: t("errors.limited") }}
        />
      </GradientCard>
    </div>
  );
}
