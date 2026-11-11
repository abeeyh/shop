import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// docs/11-design.md §6: estilo só aqui; na chamada, className apenas para layout
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-heading font-semibold transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.97] " + // #168: aperta ao clicar
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
    "focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // #102: brilho que atravessa no hover + halo violeta (efeito some com movimento reduzido)
        primary:
          "shine bg-primary text-primary-foreground shadow-[0_8px_30px_-10px_var(--primary)] hover:bg-primary-hover",
        // borda em gradiente: fundo sólido no padding-box + gradiente no border-box
        "gradient-outline":
          "border border-transparent text-heading " +
          "[background:linear-gradient(var(--background),var(--background))_padding-box,linear-gradient(116.85deg,var(--gradient-from),var(--gradient-to))_border-box] " +
          "hover:[background:linear-gradient(var(--card),var(--card))_padding-box,linear-gradient(116.85deg,var(--gradient-from),var(--gradient-to))_border-box]",
        ghost: "text-foreground hover:bg-accent",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        sm: "min-h-11 px-4 text-sm",
        md: "min-h-11 px-6 text-sm",
        lg: "min-h-12 px-8 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
