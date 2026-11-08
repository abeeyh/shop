"use client";

import { useState } from "react";

export type PickerAxis = { name: string; values: string[]; style: "slider" | "boxes" };
export type PickerVariant = {
  id: string;
  options: Record<string, string>;
  price: string | null; // já formatado no servidor; null = sob consulta (RN-106)
  note: string;
};

type Props = {
  axes: PickerAxis[];
  variants: PickerVariant[];
  initialId: string;
  onRequestLabel: string;
  onSelect: (v: PickerVariant) => void;
};

const matches = (v: PickerVariant, sel: Record<string, string>) =>
  Object.entries(sel).every(([k, val]) => v.options[k] === val);

// Escolher um valor que não combina com os outros eixos não trava o cliente: vai para a variante que
// tem esse valor e fica mais perto da escolha atual (ex.: 6/8 + "sem Tidebound" → 5/8 ou 7/8) — #100
function resolve(
  axes: PickerAxis[],
  variants: PickerVariant[],
  current: PickerVariant,
  axis: string,
  value: string,
) {
  const distance = (v: PickerVariant) =>
    axes
      .filter((a) => a.name !== axis)
      .reduce(
        (d, a) =>
          d + Math.abs(a.values.indexOf(v.options[a.name]!) - a.values.indexOf(current.options[a.name]!)),
        0,
      );
  const candidates = variants.filter((v) => v.options[axis] === value);
  return candidates.sort((a, b) => distance(a) - distance(b))[0] ?? current;
}

const box =
  "relative flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-border bg-input px-3 text-sm font-semibold text-foreground transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/15 has-[:checked]:text-heading has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring";

// #100: um eixo por linha — slider para valores em sequência (bosses, nível da chave, tier, rating) e
// caixas para escolhas soltas (Saved/Unsaved, tamanho do grupo). O preço vem do servidor por variante.
export function VariantPicker({ axes, variants, initialId, onRequestLabel, onSelect }: Props) {
  const [current, setCurrent] = useState(() => variants.find((v) => v.id === initialId) ?? variants[0]!);

  const pick = (axis: string, value: string) => {
    const next = resolve(axes, variants, current, axis, value);
    setCurrent(next);
    onSelect(next);
  };
  // valor que existe junto com o que já está escolhido nos outros eixos
  const fits = (axis: string, value: string) => {
    const others = Object.fromEntries(Object.entries(current.options).filter(([k]) => k !== axis));
    return variants.some((v) => v.options[axis] === value && matches(v, others));
  };

  return (
    <div className="grid gap-4" data-variant-picker>
      <input type="hidden" name="variant" value={current.id} />
      {axes.map((a) =>
        a.style === "slider" ? (
          <label key={a.name} className="grid gap-2 text-sm">
            <span className="flex items-baseline justify-between font-semibold text-foreground">
              {a.name}
              <span className="font-heading text-lg text-heading">{current.options[a.name]}</span>
            </span>
            <input
              type="range"
              min={0}
              max={a.values.length - 1}
              step={1}
              value={a.values.indexOf(current.options[a.name]!)}
              aria-valuetext={current.options[a.name]}
              onChange={(e) => pick(a.name, a.values[Number(e.target.value)]!)}
              className="variant-range w-full"
            />
            <span className="flex justify-between text-xs text-muted-foreground" aria-hidden="true">
              {/* muitos valores (ex.: +6 a +22) não cabem no celular: só as pontas */}
              {(a.values.length > 7 ? [a.values[0]!, a.values.at(-1)!] : a.values).map((v) => (
                <span key={v} className={v === current.options[a.name] ? "font-bold text-heading" : ""}>
                  {v}
                </span>
              ))}
            </span>
          </label>
        ) : (
          <fieldset key={a.name} className="grid gap-2 text-sm">
            <legend className="mb-2 font-semibold text-foreground">{a.name}</legend>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-2">
              {a.values.map((v) => (
                <label key={v} className={`${box} ${fits(a.name, v) ? "" : "opacity-60"}`}>
                  <input
                    type="radio"
                    name={`axis-${a.name}`}
                    value={v}
                    checked={current.options[a.name] === v}
                    onChange={() => pick(a.name, v)}
                    className="sr-only"
                  />
                  {v}
                </label>
              ))}
            </div>
          </fieldset>
        ),
      )}
      <p className="flex items-baseline justify-between gap-3 rounded-md bg-secondary px-3 py-2 text-sm">
        <span className="text-muted-foreground">{current.note}</span>
        <span className="shrink-0 font-heading font-bold text-gold">{current.price ?? onRequestLabel}</span>
      </p>
    </div>
  );
}
