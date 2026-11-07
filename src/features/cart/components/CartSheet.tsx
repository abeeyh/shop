"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/atoms/Button";
import { Drawer } from "@/components/molecules/Drawer";

export type MiniCart = {
  lines: { id: string; name: string; detail: string; total: string; available: boolean }[];
  total: string;
};

type Labels = { title: string; close: string; total: string; checkout: string; keepShopping: string };

// #109: depois de adicionar, o carrinho aparece na lateral — ir ao pagamento ou continuar comprando.
// Só exibe: itens e total vêm do servidor já calculados (docs/04 "o front só exibe").
export function CartSheet({
  cart,
  checkoutHref,
  labels,
  onClose,
}: {
  cart: MiniCart;
  checkoutHref: string;
  labels: Labels;
  onClose: () => void;
}) {
  return (
    <Drawer title={labels.title} closeLabel={labels.close} onClose={onClose}>
      <ul className="grid gap-2 py-2">
        {cart.lines.map((l) => (
          <li
            key={l.id}
            className={`flex items-start justify-between gap-3 rounded-md border border-border bg-card/60 px-3 py-2.5 ${l.available ? "" : "opacity-60"}`}
          >
            <div className="min-w-0">
              <p className="font-heading text-sm font-semibold text-heading">{l.name}</p>
              <p className="text-xs text-muted-foreground">{l.detail}</p>
            </div>
            <span className="shrink-0 font-heading text-sm font-bold text-gold">{l.total}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-baseline justify-between border-t border-border pt-4">
        <span>{labels.total}</span>
        <span className="font-heading text-xl font-bold text-gold">{cart.total}</span>
      </div>
      <div className="mt-4 grid gap-2">
        <Link href={checkoutHref} className={buttonVariants({ variant: "primary", size: "lg" })}>
          {labels.checkout}
        </Link>
        <button
          type="button"
          onClick={onClose}
          className={buttonVariants({ variant: "gradient-outline", size: "lg" })}
        >
          {labels.keepShopping}
        </button>
      </div>
    </Drawer>
  );
}
