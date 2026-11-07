import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Select nativo (acessível por padrão) com os tokens do doc 11
export const selectVariants = cva(
  "w-full appearance-none border border-border bg-input bg-[length:5px_5px,5px_5px] bg-no-repeat pr-9 text-heading " +
    "bg-[linear-gradient(45deg,transparent_50%,var(--muted-foreground)_50%),linear-gradient(135deg,var(--muted-foreground)_50%,transparent_50%)] " +
    "bg-[position:calc(100%-18px)_50%,calc(100%-13px)_50%] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
  {
    variants: {
      size: {
        sm: "min-h-11 rounded-full pl-3 text-[13px] lg:min-h-9",
        md: "min-h-11 rounded-sm pl-3.5 text-base",
      },
    },
    defaultVariants: { size: "md" },
  },
);

type Props = Omit<ComponentProps<"select">, "size"> & VariantProps<typeof selectVariants>;

export function Select({ className, size, ...props }: Props) {
  return <select className={cn(selectVariants({ size }), className)} {...props} />;
}
