"use client";

import {
  BadgePercent,
  BookOpen,
  Bug,
  Folders,
  LayoutDashboard,
  LogOut,
  Menu,
  MessagesSquare,
  Package,
  Receipt,
  ScrollText,
  ShieldCheck,
  Tags,
  Store,
  TicketPercent,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Drawer } from "@/components/molecules/Drawer";
import { signOut } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

// ícone por chave: componente não atravessa do servidor para o cliente
const ICONS = {
  overview: LayoutDashboard,
  support: MessagesSquare,
  orders: Receipt,
  reports: Bug,
  categories: Folders,
  tags: Tags,
  products: Package,
  promotions: BadgePercent,
  coupons: TicketPercent,
  team: Users,
  audit: ScrollText,
  docs: BookOpen,
  twoFactor: ShieldCheck,
  store: Store,
};
export type AdminNavItem = { key: keyof typeof ICONS; href: string; label: string };
export type AdminNavGroup = { label: string; items: AdminNavItem[] };

type Props = {
  locale: string;
  homeHref: string;
  title: string;
  groups: AdminNavGroup[];
  account: AdminNavItem[];
  user: { email: string; role: string };
  labels: { nav: string; menu: string; close: string; signOut: string };
};

// #144: painel com barra lateral (desktop) e gaveta (celular). Mostra só o que o papel abre (RN-06);
// a permissão de verdade continua em cada página e action (requireStaff).
export function AdminNav(p: Props) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  // subpáginas contam só dentro do painel: "/admin" (visão geral) e "/pt-br" (loja) valem só exatas
  const active = (href: string) => path === href || (href.includes("/admin/") && path.startsWith(`${href}/`));

  const link = (item: AdminNavItem) => {
    const Icon = ICONS[item.key];
    const on = active(item.href);
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          aria-current={on ? "page" : undefined}
          onClick={() => setOpen(false)}
          className={cn(
            "flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            on
              ? "bg-primary/15 text-heading shadow-[inset_3px_0_0_var(--primary)]"
              : "text-muted-foreground hover:bg-accent hover:text-heading",
          )}
        >
          <Icon aria-hidden="true" className={cn("size-4 shrink-0", on && "text-link")} />
          {item.label}
        </Link>
      </li>
    );
  };

  const body = (
    <div className="flex h-full flex-col gap-6 p-4">
      <nav aria-label={p.labels.nav} className="flex flex-col gap-5">
        {p.groups.map((g) => (
          <div key={g.label} className="flex flex-col gap-1">
            <p className="px-3 text-[11px] font-bold tracking-widest text-muted-foreground/80 uppercase">
              {g.label}
            </p>
            <ul className="flex flex-col gap-0.5">{g.items.map(link)}</ul>
          </div>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-1 border-t border-border pt-4">
        <ul className="flex flex-col gap-0.5">{p.account.map(link)}</ul>
        <div className="mt-2 flex items-center gap-3 rounded-md bg-muted px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-heading" title={p.user.email}>
              {p.user.email}
            </p>
            <p className="text-xs text-muted-foreground">{p.user.role}</p>
          </div>
          <form action={signOut}>
            <input type="hidden" name="locale" value={p.locale} />
            <button
              type="submit"
              aria-label={p.labels.signOut}
              title={p.labels.signOut}
              className="grid size-10 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-heading focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <LogOut aria-hidden="true" className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  const brand = (
    <Link href={p.homeHref} className="flex items-center gap-2 font-heading text-base font-bold text-heading">
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-md bg-linear-[135deg] from-gradient-from to-gradient-to text-sm text-primary-foreground"
      >
        S
      </span>
      {p.title}
    </Link>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh flex-col overflow-y-auto border-r border-border bg-card/60 backdrop-blur lg:flex">
        <div className="border-b border-border px-5 py-4">{brand}</div>
        {body}
      </aside>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/85 px-4 py-2 backdrop-blur lg:hidden">
        {brand}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={p.labels.menu}
          aria-expanded={open}
          className="grid size-11 place-items-center rounded-full border border-border text-heading hover:bg-accent"
        >
          <Menu aria-hidden="true" className="size-5" />
        </button>
      </header>
      {open ? (
        <Drawer title={p.title} closeLabel={p.labels.close} onClose={() => setOpen(false)}>
          {body}
        </Drawer>
      ) : null}
    </>
  );
}
