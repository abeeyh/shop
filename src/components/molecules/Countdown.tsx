"use client";

import { useSyncExternalStore } from "react";

// relógio compartilhado: um único intervalo para todas as contagens da página
let listeners: (() => void)[] = [];
let timer: ReturnType<typeof setInterval> | undefined;
function subscribe(cb: () => void) {
  listeners.push(cb);
  timer ??= setInterval(() => listeners.forEach((l) => l()), 1000);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
    if (!listeners.length && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}
const nowSeconds = () => Math.floor(Date.now() / 1000);

const pad = (n: number) => String(n).padStart(2, "0");

// Contagem até `until` (ISO). O servidor renderiza a partir de `serverNow` para o HTML inicial bater.
export function Countdown({ until, serverNow, label }: { until: string; serverNow: number; label: string }) {
  const now = useSyncExternalStore(subscribe, nowSeconds, () => serverNow);
  let s = Math.max(0, Math.floor(new Date(until).getTime() / 1000) - now);
  const d = Math.floor(s / 86400);
  s %= 86400;
  const parts = [
    ...(d ? [`${d}d`] : []),
    pad(Math.floor(s / 3600)),
    pad(Math.floor((s % 3600) / 60)),
    pad(s % 60),
  ];
  return (
    <span
      role="timer"
      aria-label={label}
      className="inline-flex gap-1.5 font-heading text-sm font-semibold text-heading tabular-nums"
    >
      {parts.map((p, i) => (
        <b key={i} className="rounded-sm bg-muted px-2 py-1">
          {p}
        </b>
      ))}
    </span>
  );
}
