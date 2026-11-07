import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import type { ReactNode } from "react";

// Campo com rótulo para os formulários do admin (renderizado no servidor)
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}

export function Check({
  label,
  name,
  defaultChecked,
}: {
  label: string;
  name: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-heading">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="size-4.5 accent-primary"
      />
      {label}
    </label>
  );
}

export const tableCls =
  "w-full text-left text-sm [&_td]:border-t [&_td]:border-border [&_td]:px-3 [&_td]:py-2.5 " +
  "[&_th]:px-3 [&_th]:py-2 [&_th]:text-muted-foreground";
