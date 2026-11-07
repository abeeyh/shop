"use client";

import { Menu, X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { buttonVariants } from "@/components/atoms/Button";
import { usePathname } from "@/i18n/navigation";

type Props = { openLabel: string; closeLabel: string; children: ReactNode };

// Menu do celular (docs/11 §7): categorias e preferências; fecha ao navegar e com Esc
export function MobileMenu({ openLabel, closeLabel, children }: Props) {
  const pathname = usePathname();
  // aberto só enquanto continuar na página em que foi aberto: navegar fecha sem efeito extra
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const setOpen = (value: boolean) => setOpenAt(value ? pathname : null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenAt(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className={buttonVariants({ variant: "ghost", size: "icon" })}
        aria-expanded={open}
        aria-controls="menu-mobile"
        aria-label={open ? closeLabel : openLabel}
        onClick={() => setOpen(!open)}
      >
        {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
      </button>
      <div
        id="menu-mobile"
        hidden={!open}
        className="absolute inset-x-0 top-full border-b border-border bg-card px-4 py-4 sm:px-5"
      >
        {children}
      </div>
    </div>
  );
}
