import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Campo de texto com os tokens do doc 11 (mesmo visual dos formulários da loja)
export const inputClass =
  "min-h-11 w-full rounded-sm border border-border bg-input px-3.5 text-heading placeholder:text-muted-foreground " +
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-invalid:border-error-text";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClass, "min-h-24 py-2.5", className)} {...props} />;
}
