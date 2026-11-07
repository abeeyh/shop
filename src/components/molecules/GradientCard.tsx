import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// docs/11 §8: cards com gradiente a 20% (ou sólidos), raio de 15 px, hover discreto
export const cardVariants = cva("rounded-lg p-5", {
  variants: {
    tone: {
      gradient: "bg-linear-[116.85deg] from-gradient-from/20 to-gradient-to/20",
      solid: "border border-border bg-card",
    },
    interactive: {
      true: "transition-transform duration-200 hover:scale-[1.02] focus-within:scale-[1.02]",
      false: "",
    },
  },
  defaultVariants: { tone: "gradient", interactive: false },
});

type Props = ComponentProps<"div"> & VariantProps<typeof cardVariants>;

export function GradientCard({ className, tone, interactive, ...props }: Props) {
  return <div className={cn(cardVariants({ tone, interactive }), className)} {...props} />;
}
