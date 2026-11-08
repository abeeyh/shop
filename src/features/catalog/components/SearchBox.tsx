"use client";

import { Search } from "lucide-react";
import Form from "next/form";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { Suggestions } from "../suggest";
import { KindIcon, type Kind } from "./KindIcon";

type Labels = {
  label: string;
  placeholder: string;
  categories: string;
  products: string;
  seeAll: string; // com {q}
  empty: string;
  onRequest: string;
};
type Props = { id: string; action: string; locale: string; labels: Labels };
type Option = { key: string; href: string };

const DEBOUNCE_MS = 200;
const EMPTY: Suggestions = { categories: [], products: [] };

// #110 / RN-100: busca do cabeçalho com sugestões (produtos e categorias) enquanto digita.
// Combobox ARIA: setas escolhem, Enter abre a sugestão escolhida (ou a página de resultados), Esc fecha.
// Sem JavaScript continua um formulário GET para /produtos.
export function SearchBox({ id, action, locale, labels }: Props) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [data, setData] = useState<Suggestions>(EMPTY);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?${new URLSearchParams({ q: term, locale })}`, {
          signal: ctrl.signal,
        });
        if (res.ok) setData((await res.json()) as Suggestions);
      } catch {
        // abortada (nova tecla) ou rede: mantém o que já está na lista
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, locale]);

  const shown = q.trim().length >= 2 ? data : EMPTY;
  const options: Option[] = [
    ...shown.categories.map((c) => ({ key: `c:${c.href}`, href: c.href })),
    ...shown.products.map((p) => ({ key: `p:${p.href}`, href: p.href })),
  ];
  const expanded = open && q.trim().length >= 2;
  const optionId = (i: number) => `${listId}-${i}`;

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") return setOpen(false);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (options.length ? (i + step + options.length) % options.length : -1));
    } else if (e.key === "Enter" && expanded && active >= 0 && options[active]) {
      e.preventDefault(); // abre a sugestão em vez de enviar a busca
      go(options[active].href);
    }
  };

  // posição na lista inteira (categorias primeiro, depois produtos) = índice da seta
  const optionProps = (href: string, i: number) => ({
    id: optionId(i),
    role: "option" as const,
    "aria-selected": i === active,
    onMouseDown: (e: React.MouseEvent) => e.preventDefault(), // não tira o foco do campo
    onClick: () => go(href),
    onMouseEnter: () => setActive(i),
  });
  const optionCls =
    "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm aria-selected:bg-accent aria-selected:text-heading";

  return (
    <div
      ref={box}
      className="relative w-full"
      onBlur={(e) => {
        if (!box.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <Form action={action} role="search" className="relative w-full" onSubmit={() => setOpen(false)}>
        <label htmlFor={id} className="sr-only">
          {labels.label}
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id={id}
          name="q"
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
          minLength={2}
          maxLength={80}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={labels.placeholder}
          autoComplete="off"
          className="min-h-11 w-full rounded-full border border-border bg-input pr-4 pl-10 text-sm text-heading placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:min-h-10"
        />
      </Form>
      {expanded ? (
        <div
          id={listId}
          role="listbox"
          aria-label={labels.label}
          className="absolute inset-x-0 z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-lg border border-border bg-popover p-2 shadow-2xl"
        >
          {shown.categories.length ? (
            <div role="group" aria-label={labels.categories}>
              <p className="px-3 pt-1 pb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {labels.categories}
              </p>
              {shown.categories.map((c, i) => (
                <div key={c.href} className={optionCls} {...optionProps(c.href, i)}>
                  <span className="font-semibold text-heading">{c.name}</span>
                </div>
              ))}
            </div>
          ) : null}
          {shown.products.length ? (
            <div role="group" aria-label={labels.products}>
              <p className="px-3 pt-2 pb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {labels.products}
              </p>
              {shown.products.map((p, i) => (
                <div key={p.href} className={optionCls} {...optionProps(p.href, shown.categories.length + i)}>
                  <KindIcon kind={p.kind as Kind} className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-heading">{p.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{p.category}</span>
                  </span>
                  <span className="shrink-0 font-heading font-bold text-gold">
                    {p.price ?? labels.onRequest}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          {options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">{labels.empty}</p>
          ) : null}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => go(`${action}?${new URLSearchParams({ q: q.trim() })}`)}
            className="mt-1 w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-link hover:bg-accent"
          >
            {labels.seeAll.replace("{q}", q.trim())}
          </button>
        </div>
      ) : null}
    </div>
  );
}
