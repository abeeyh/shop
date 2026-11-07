"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// RN-91: em qualquer página — o link leva a página atual para o reporte
export function ReportLink({ locale, label }: { locale: string; label: string }) {
  const path = usePathname();
  return (
    <Link
      href={`/${locale}/reportar?pagina=${encodeURIComponent(path)}`}
      className="text-sm text-foreground hover:text-heading"
    >
      {label}
    </Link>
  );
}
