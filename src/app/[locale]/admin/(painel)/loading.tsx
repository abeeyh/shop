"use client";

import { useTranslations } from "next-intl";
import { LoadingRegion, TableSkeleton, TitleSkeleton } from "@/components/molecules/Skeletons";

// #88: esqueleto das telas do admin (tabela) enquanto a página carrega
export default function PanelLoading() {
  const t = useTranslations("Catalog");
  return (
    <LoadingRegion label={t("loading")}>
      <TitleSkeleton />
      <TableSkeleton />
    </LoadingRegion>
  );
}
