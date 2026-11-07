import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { buttonVariants } from "@/components/atoms/Button";

// Página de "não encontrado" no idioma do usuário (o Next injeta noindex)
export default async function NotFound() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "NotFound" });
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-5 px-4 py-24 text-center">
      <span className="rounded-full bg-muted px-3 py-1 font-heading text-xs font-semibold text-muted-foreground">
        404
      </span>
      <h1 className="font-heading text-[clamp(1.75rem,4vw,2.5rem)] font-bold text-heading">{t("title")}</h1>
      <p className="text-muted-foreground">{t("text")}</p>
      <Link href={`/${locale}`} className={buttonVariants({ variant: "primary" })}>
        {t("back")}
      </Link>
    </div>
  );
}
