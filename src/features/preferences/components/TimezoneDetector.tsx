"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { savePreferences } from "../actions";

// RN-82: na primeira visita detecta o fuso do navegador e grava (o servidor valida);
// a região é sugerida pelo fuso se o visitante ainda não escolheu (RN-14, doc 04)
export function TimezoneDetector({ hasTimezone }: { hasTimezone: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (hasTimezone) return;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    savePreferences({ timezone, auto: true }).then((r) => {
      if (r.ok) router.refresh();
    });
  }, [hasTimezone, router]);
  return null;
}
