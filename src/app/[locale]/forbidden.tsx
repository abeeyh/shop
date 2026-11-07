import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { buttonVariants } from "@/components/atoms/Button";

// RN-06: equipe sem permissão para a tela (ex.: suporte em preços/cupons) — 403
export default async function Forbidden() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "Forbidden" });
  return (
    <main className="mx-auto grid w-full max-w-xl gap-4 px-4 py-24 text-center">
      <h1 className="font-heading text-3xl font-bold text-heading">{t("title")}</h1>
      <p className="text-muted-foreground">{t("message")}</p>
      <Link href={`/${locale}/admin`} className={buttonVariants({ variant: "primary" })}>
        {t("back")}
      </Link>
    </main>
  );
}
