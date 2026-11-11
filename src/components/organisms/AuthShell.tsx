import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { GradientCard } from "@/components/molecules/GradientCard";

type Props = { title: string; intro?: ReactNode; storeHref: string; storeLabel: string; children: ReactNode };

// RF-32 (doc 17): casca das telas de entrada da equipe (login, código, 2FA, convite) — marca, volta à loja
export function AuthShell({ title, intro, storeHref, storeLabel, children }: Props) {
  return (
    <main className="mx-auto grid w-full max-w-md gap-6 px-4 py-14">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-heading text-base font-bold text-heading">
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-md bg-linear-[135deg] from-gradient-from to-gradient-to text-sm text-primary-foreground"
          >
            S
          </span>
          Shop
        </span>
        <Link href={storeHref} className="inline-flex items-center gap-1.5 text-sm text-link hover:underline">
          <ArrowLeft aria-hidden="true" className="size-4" />
          {storeLabel}
        </Link>
      </div>
      <div className="grid gap-2">
        <h1 className="font-heading text-3xl font-bold text-heading">{title}</h1>
        {intro ? <p className="text-muted-foreground">{intro}</p> : null}
      </div>
      {children ? <GradientCard tone="solid">{children}</GradientCard> : null}
    </main>
  );
}
