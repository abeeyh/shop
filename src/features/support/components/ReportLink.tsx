"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

type Props = { locale: string; label: string };
const cls = "text-sm text-foreground hover:text-heading";

function WithPage({ locale, label }: Props) {
  const path = usePathname();
  return (
    <Link href={`/${locale}/reportar?pagina=${encodeURIComponent(path)}`} className={cls}>
      {label}
    </Link>
  );
}

// RN-91: em qualquer página — o link leva a página atual para o reporte. A URL só existe na requisição
// (cacheComponents): até lá, o mesmo link sem a página
export function ReportLink(props: Props) {
  return (
    <Suspense
      fallback={
        <Link href={`/${props.locale}/reportar`} className={cls}>
          {props.label}
        </Link>
      }
    >
      <WithPage {...props} />
    </Suspense>
  );
}
