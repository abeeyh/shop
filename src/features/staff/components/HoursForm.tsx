"use client";

import { useActionState } from "react";
import { buttonVariants } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { saveHours, type HoursState } from "../actions";

type Day = { weekday: number; label: string; open: boolean; start: string; end: string };

// RN-99: uma janela por dia, em UTC (o cliente vê no fuso dele)
export function HoursForm({
  locale,
  days,
  labels,
}: {
  locale: string;
  days: Day[];
  labels: { open: string; start: string; end: string; save: string; saved: string; error: string };
}) {
  const [state, action, pending] = useActionState<HoursState, FormData>(saveHours, { status: "idle" });
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="locale" value={locale} />
      <ul className="grid gap-2">
        {days.map((d) => (
          <li key={d.weekday} className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex w-36 items-center gap-2 font-semibold text-heading">
              <input
                type="checkbox"
                name={`open-${d.weekday}`}
                defaultChecked={d.open}
                className="size-4.5 accent-primary"
              />
              {d.label}
            </label>
            <label className="flex items-center gap-2">
              <span className="text-muted-foreground">{labels.start}</span>
              <Input name={`start-${d.weekday}`} type="time" defaultValue={d.start} className="w-32" />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-muted-foreground">{labels.end}</span>
              <Input name={`end-${d.weekday}`} type="time" defaultValue={d.end} className="w-32" />
            </label>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className={buttonVariants({ variant: "primary", size: "sm" })}
        >
          {labels.save}
        </button>
        <p role="status" className="text-sm">
          {state.status === "ok" ? labels.saved : null}
        </p>
        {state.status === "error" ? <p className="text-sm text-error-text">{labels.error}</p> : null}
      </div>
    </form>
  );
}
