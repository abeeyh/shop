"use client";

import { useRouter as useNextRouter } from "next/navigation";
import { useTransition } from "react";
import { Select } from "@/components/atoms/Select";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { savePreferences, saveTheme } from "../actions";

type Props = {
  idPrefix: string;
  locale: string;
  locales: { code: string; label: string }[];
  timezone: string;
  detecting: boolean; // RN-82: fuso ainda não detectado — seletor bloqueado até a detecção gravar
  timezones: string[];
  theme: string;
  themes: { code: string; label: string }[];
  labels: { language: string; timezone: string; detecting: string; theme: string };
  stacked?: boolean;
};

// RN-81 (idioma), RN-111 (tema), RN-82 (fuso). Região: só US (RN-14): o servidor valida e grava; aqui só se escolhe
export function PreferenceSelects(p: Props) {
  const router = useRouter();
  const nextRouter = useNextRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const save = (input: { timezone: string }) =>
    startTransition(async () => {
      const result = await savePreferences(input);
      if (result.ok) nextRouter.refresh();
    });

  const field = (id: string, label: string, control: React.ReactNode) => (
    <label htmlFor={`${p.idPrefix}-${id}`} className={cn("flex flex-col gap-1.5", !p.stacked && "contents")}>
      <span className={p.stacked ? "text-sm font-semibold text-foreground" : "sr-only"}>{label}</span>
      {control}
    </label>
  );

  return (
    <div className={cn("flex gap-2", p.stacked ? "flex-col" : "items-center")} aria-busy={pending}>
      {field(
        "locale",
        p.labels.language,
        <Select
          id={`${p.idPrefix}-locale`}
          className={p.stacked ? undefined : "w-auto"}
          value={p.locale}
          onChange={(e) => router.replace(pathname, { locale: e.target.value })}
        >
          {p.locales.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </Select>,
      )}
      {field(
        "theme",
        p.labels.theme,
        <Select
          id={`${p.idPrefix}-theme`}
          className={p.stacked ? undefined : "w-auto"}
          key={p.theme} // tema da conta chegou ao entrar: o seletor acompanha
          defaultValue={p.theme}
          onChange={(e) => {
            const theme = e.target.value;
            document.documentElement.dataset.theme = theme; // troca na hora; o servidor valida e grava
            void saveTheme(theme);
          }}
        >
          {p.themes.map((t) => (
            <option key={t.code} value={t.code}>
              {t.label}
            </option>
          ))}
        </Select>,
      )}
      {field(
        "timezone",
        p.labels.timezone,
        <Select
          id={`${p.idPrefix}-timezone`}
          className={p.stacked ? undefined : "w-auto max-w-48"}
          value={p.timezone}
          disabled={pending || p.detecting}
          onChange={(e) => save({ timezone: e.target.value })}
        >
          {p.detecting ? <option value={p.timezone}>{p.labels.detecting}</option> : null}
          {p.timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace(/_/g, " ")}
            </option>
          ))}
        </Select>,
      )}
    </div>
  );
}
