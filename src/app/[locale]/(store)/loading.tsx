"use client";

import { useTranslations } from "next-intl";
import { CardGridSkeleton, LoadingRegion, TitleSkeleton } from "@/components/molecules/Skeletons";

// #88: esqueleto das páginas da loja enquanto o servidor busca os dados (aparece na hora)
export default function StoreLoading() {
  const t = useTranslations("Catalog");
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-5">
      <LoadingRegion label={t("loading")}>
        <TitleSkeleton />
        <CardGridSkeleton />
      </LoadingRegion>
    </div>
  );
}
