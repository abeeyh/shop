import { cn } from "@/lib/utils";

// Bloco de carregamento (docs/11): só token da paleta; sem animação para quem pede menos movimento
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-muted motion-reduce:animate-none", className)}
    />
  );
}
