"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Fila da equipe atualiza sozinha. shortcut: polling de 15 s; SSE da fila quando o volume pedir
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
