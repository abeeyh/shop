import { cva } from "class-variance-authority";
import type { ReactNode } from "react";

// Doc 11 §8 (formulários do admin): cada grupo de campos é uma seção com título e ajuda curta
const section = cva("grid content-start gap-4 rounded-lg border bg-card p-4 sm:p-5", {
  variants: { tone: { default: "border-border", danger: "border-error-text/40" } },
  defaultVariants: { tone: "default" },
});

export function FormSection(p: {
  title: string;
  hint?: string;
  tone?: "default" | "danger";
  children: ReactNode;
}) {
  return (
    <section className={section({ tone: p.tone })}>
      <header className="grid gap-1">
        <h2 className="font-heading text-base font-bold text-heading">{p.title}</h2>
        {p.hint ? <p className="text-sm text-muted-foreground">{p.hint}</p> : null}
      </header>
      <div className="grid gap-4">{p.children}</div>
    </section>
  );
}
