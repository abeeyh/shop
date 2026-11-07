"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/atoms/Button";

// RN-90: mensagem genérica no idioma do usuário + código estável + ID do erro; nunca stack trace.
// O ID (digest) é o mesmo que vai para o log do servidor (src/instrumentation.ts).
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations("Errors");
  const locale = useLocale();
  const path = usePathname();
  const id =
    typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : "client";
  return (
    <main className="mx-auto grid w-full max-w-xl gap-4 px-4 py-24 text-center">
      <h1 className="font-heading text-3xl font-bold text-heading">{t("title")}</h1>
      <p className="text-muted-foreground">{t("message")}</p>
      <p className="text-sm">
        {t("code")}: <code className="font-mono text-heading">E_INTERNAL</code> · {t("id")}:{" "}
        <code data-testid="error-id" className="font-mono text-heading">
          {id}
        </code>
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => retry()} className={buttonVariants({ variant: "primary" })}>
          {t("retry")}
        </button>
        <Link
          href={`/${locale}/reportar?pagina=${encodeURIComponent(path)}&erro=${encodeURIComponent(id)}`}
          className={buttonVariants({ variant: "ghost" })}
        >
          {t("report")}
        </Link>
      </div>
    </main>
  );
}
