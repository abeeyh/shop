import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)

// RN-99: janelas de atendimento por dia da semana, em minutos UTC (0 = domingo).
// Fim menor que o início = atravessa a meia-noite UTC (ex.: 22:00–02:00).
export type Window = { weekday: number; startMin: number; endMin: number };

const DAY = 1440;
const minuteOfWeek = (d: Date) => d.getUTCDay() * DAY + d.getUTCHours() * 60 + d.getUTCMinutes();

// cada janela vira [início, fim) em minutos da semana; a que atravessa a meia-noite termina no dia seguinte
const spans = (hours: Window[]) =>
  hours.map((w) => {
    const start = w.weekday * DAY + w.startMin;
    const end = w.weekday * DAY + w.endMin + (w.endMin <= w.startMin ? DAY : 0);
    return { start, end };
  });

// sem horário cadastrado = sempre aberto (o admin ainda não configurou)
export function isOpen(hours: Window[], now = new Date()): boolean {
  if (hours.length === 0) return true;
  const m = minuteOfWeek(now);
  const week = 7 * DAY;
  return spans(hours).some(
    ({ start, end }) => (m >= start && m < end) || (m + week >= start && m + week < end),
  );
}

// próxima abertura (para "voltamos às …" no fuso do cliente — RN-83)
export function nextOpening(hours: Window[], now = new Date()): Date | null {
  if (hours.length === 0) return null;
  const m = minuteOfWeek(now);
  const week = 7 * DAY;
  const ahead = spans(hours).map(({ start }) => (start - m + week) % week || week);
  const minutes = Math.min(...ahead);
  const next = new Date(now.getTime() + minutes * 60_000);
  next.setUTCSeconds(0, 0);
  return next;
}

// "09:30" ↔ 570
export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h! * 60 + m!;
};
export const toHHMM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
