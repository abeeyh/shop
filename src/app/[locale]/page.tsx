import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { ComingSoonTemplate } from "@/components/templates/ComingSoonTemplate";

export default function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("ComingSoon");

  return (
    <ComingSoonTemplate
      badge={t("badge")}
      title={t("title")}
      subtitle={t("subtitle")}
      // texto de marketing da página "em breve"; as categorias reais vêm do banco na vitrine (RN-13, #15)
      tags={t.raw("tags") as string[]}
      footnote={t("payment")}
    />
  );
}
