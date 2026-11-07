"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};
const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

type Props = {
  iso: string; // horário em UTC (RN-83)
  locale: string; // BCP 47 canônico
  timeZone: string | null; // fuso escolhido; null = ainda não detectado → usa o do navegador
  withDay?: boolean;
};

// RN-83: mostra o horário no fuso do usuário. Sem fuso salvo, o servidor não sabe qual usar:
// renderiza vazio e o navegador preenche com o fuso dele (doc 04), sem divergência de hidratação.
export function LocalTime({ iso, locale, timeZone, withDay = true }: Props) {
  const clientTz = useSyncExternalStore(noop, browserTimezone, () => null);
  const tz = timeZone ?? clientTz;
  if (!tz) return <time dateTime={iso} />;
  const text = new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    ...(withDay ? { weekday: "short", day: "2-digit", month: "short" } : {}),
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
  return <time dateTime={iso}>{text}</time>;
}
