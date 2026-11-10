import { ArrowLeft } from "lucide-react";
import Link from "next/link";

// Volta previsível para a lista (doc 11 §8)
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-md text-sm text-link hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
      {label}
    </Link>
  );
}
