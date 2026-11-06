import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { ComingSoonTemplate } from "@/components/templates/ComingSoonTemplate";

const CATEGORIES = ["gold", "raids", "dungeons"] as const;

export default function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("ComingSoon");

  return (
    <ComingSoonTemplate
      badge={t("badge")}
      title={t("title")}
      subtitle={t("subtitle")}
      tags={CATEGORIES.map((key) => t(`categories.${key}`))}
      footnote={t("payment")}
    />
  );
}
