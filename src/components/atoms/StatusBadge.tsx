import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// RF-07 (doc 17): status com cor e texto (a cor nunca é a única pista — doc 11 §4)
const badge = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap before:size-1.5 before:rounded-full before:bg-current",
  {
    variants: {
      tone: {
        neutral: "border-border bg-muted text-muted-foreground",
        info: "border-link/30 bg-link/10 text-link",
        success: "border-gradient-to/30 bg-gradient-to/10 text-gradient-to",
        warning: "border-gold/30 bg-gold/10 text-gold",
        danger: "border-error-text/30 bg-error-text/10 text-error-text",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);
export type BadgeTone = NonNullable<VariantProps<typeof badge>["tone"]>;

export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone?: BadgeTone;
  children: string;
  className?: string;
}) {
  return <span className={cn(badge({ tone }), className)}>{children}</span>;
}
