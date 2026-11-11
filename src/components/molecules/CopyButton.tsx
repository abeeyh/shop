"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { buttonVariants } from "@/components/atoms/Button";

// Copia um texto (ex.: link do convite, que aparece uma vez só) e confirma por 2 s
export function CopyButton({ text, label, copied }: { text: string; label: string; copied: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={buttonVariants({ variant: "ghost", size: "sm" })}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      }}
    >
      {done ? (
        <Check aria-hidden="true" className="size-4" />
      ) : (
        <Copy aria-hidden="true" className="size-4" />
      )}
      <span aria-live="polite">{done ? copied : label}</span>
    </button>
  );
}
