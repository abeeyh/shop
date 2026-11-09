"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Drawer } from "@/components/molecules/Drawer";

// RF-04 (doc 17): criar/editar numa gaveta sobre a lista. Aberta pela URL (?novo=1 / ?editar=id), então
// recarregar e compartilhar o link funcionam; fechar (X, Esc, fundo) volta para a lista.
export function RouteDrawer(p: {
  title: string;
  closeHref: string;
  closeLabel: string;
  children: ReactNode;
  wide?: boolean; // formulário longo (produto)
}) {
  const router = useRouter();
  return (
    <Drawer
      title={p.title}
      closeLabel={p.closeLabel}
      wide={p.wide}
      onClose={() => router.push(p.closeHref, { scroll: false })}
    >
      <div className="grid gap-5 px-5 pb-6">{p.children}</div>
    </Drawer>
  );
}
