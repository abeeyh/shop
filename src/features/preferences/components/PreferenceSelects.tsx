"use client";

import { useRouter as useNextRouter } from "next/navigation";
import { useTransition } from "react";
import { Select } from "@/components/atoms/Select";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { savePreferences } from "../actions";

type Props = {
  idPrefix: string;
  locale: string;
  locales: { code: string; label: string }[];
  region: string;
  regions: readonly string[];
  timezone: string;
  detecting: boolean; // RN-82: fuso ainda não detectado — seletor bloqueado até a detecção gravar
  timezones: string[];
  labels: { language: string; region: string; timezone: string; detecting: string };
  stacked?: boolean;
};

// RN-81 (idioma), RN-14 (região), RN-82 (fuso): o servidor valida e grava; aqui só se escolhe
export function PreferenceSelects(p: Props) {
  const router = useRouter();
  const nextRouter = useNextRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const save = (input: { region?: string; timezone?: string }) =>
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
        "region",
        p.labels.region,
        <Select
          id={`${p.idPrefix}-region`}
          size="sm"
          className={p.stacked ? undefined : "w-auto"}
          value={p.region}
          disabled={pending}
          onChange={(e) => save({ region: e.target.value })}
        >
          {p.regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>,
      )}
      {field(
        "locale",
        p.labels.language,
        <Select
          id={`${p.idPrefix}-locale`}
          size="sm"
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
        "timezone",
        p.labels.timezone,
        <Select
          id={`${p.idPrefix}-timezone`}
          size="sm"
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
