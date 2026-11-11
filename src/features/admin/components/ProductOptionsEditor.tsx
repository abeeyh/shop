"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import {
  axisToText,
  addonsToText,
  combos,
  variantKey,
  variantsToText,
  type Addon,
  type Axis,
  type Variant,
} from "../product-options";

type Labels = {
  addons: string;
  addonName: string;
  percent: string;
  addAddon: string;
  axes: string;
  axisName: string;
  style: string;
  slider: string;
  boxes: string;
  values: string;
  valuesHint: string;
  addAxis: string;
  variants: string;
  variantsHint: string;
  include: string;
  price: string;
  onRequest: string;
  note: string;
  remove: string;
  tooMany: string;
};

type Props = { addons: Addon[]; axes: Axis[]; variants: Variant[]; gold: boolean; labels: Labels };

const MAX_AXES = 4;
const MAX_VARIANTS = 200;
const iconBtn =
  "grid size-11 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-heading focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";
const addBtn =
  "inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold text-link hover:bg-accent";

// RF-09 a RF-11 (doc 17): adicionais, eixos e a grade de preços sem digitar o formato de texto. Os campos
// escondidos levam o MESMO texto que o servidor já valida (schemas.ts) — a regra continua lá (docs/04).
export function ProductOptionsEditor({ gold, labels: l, ...initial }: Props) {
  const [addons, setAddons] = useState<Addon[]>(initial.addons);
  const [axes, setAxes] = useState<Axis[]>(initial.axes);
  // preço/nota/ativa por combinação: guardado pela chave, sobrevive a mexer nos eixos
  const [byKey, setByKey] = useState<Record<string, Variant>>(() =>
    Object.fromEntries(initial.variants.map((v) => [variantKey(initial.axes, v.options), v])),
  );
  const grid = useMemo(() => combos(axes), [axes]);
  const rows = grid.slice(0, MAX_VARIANTS);
  const chosen = rows.flatMap((options) => {
    const v = byKey[variantKey(axes, options)];
    return v?.included ? [{ ...v, options }] : [];
  });
  const setRow = (options: Record<string, string>, patch: Partial<Variant>) =>
    setByKey((m) => {
      const k = variantKey(axes, options);
      const cur = m[k] ?? { options, price: "", onRequest: false, note: "", included: true };
      return { ...m, [k]: { ...cur, ...patch, options } };
    });
  const setAxis = (i: number, patch: Partial<Axis>) =>
    setAxes((a) => a.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <div className="grid gap-6">
      <input type="hidden" name="addons" value={addonsToText(addons)} />
      <input type="hidden" name="optionAxes" value={axisToText(axes)} />
      <input type="hidden" name="variants" value={variantsToText(axes, chosen)} />

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-semibold text-foreground">{l.addons}</legend>
        {addons.map((a, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              aria-label={l.addonName}
              value={a.name}
              maxLength={40}
              onChange={(e) =>
                setAddons((x) => x.map((y, j) => (j === i ? { ...y, name: e.target.value } : y)))
              }
            />
            <Input
              aria-label={l.percent}
              type="number"
              min={1}
              max={100}
              className="w-24"
              value={a.percent}
              onChange={(e) =>
                setAddons((x) => x.map((y, j) => (j === i ? { ...y, percent: e.target.value } : y)))
              }
            />
            <span className="text-sm text-muted-foreground">%</span>
            <button
              type="button"
              aria-label={`${l.remove} ${a.name}`}
              className={iconBtn}
              onClick={() => setAddons((x) => x.filter((_, j) => j !== i))}
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          className={addBtn}
          onClick={() => setAddons((x) => [...x, { name: "", percent: "" }])}
        >
          <Plus aria-hidden="true" className="size-4" /> {l.addAddon}
        </button>
      </fieldset>

      {gold ? null : (
        <fieldset className="grid gap-3">
          <legend className="mb-1 text-sm font-semibold text-foreground">{l.axes}</legend>
          {axes.map((a, i) => (
            <div
              key={i}
              className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_9rem_auto]"
            >
              <Input
                aria-label={l.axisName}
                placeholder={l.axisName}
                value={a.name}
                maxLength={30}
                onChange={(e) => setAxis(i, { name: e.target.value })}
              />
              <Select
                aria-label={l.style}
                value={a.style}
                onChange={(e) => setAxis(i, { style: e.target.value as Axis["style"] })}
              >
                <option value="slider">{l.slider}</option>
                <option value="boxes">{l.boxes}</option>
              </Select>
              <button
                type="button"
                aria-label={`${l.remove} ${a.name}`}
                className={iconBtn}
                onClick={() => setAxes((x) => x.filter((_, j) => j !== i))}
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
              <label className="grid gap-1 text-xs text-muted-foreground sm:col-span-3">
                {l.values}
                <Input
                  value={a.values.join(", ")}
                  placeholder="2/8, 3/8, 4/8"
                  onChange={(e) => setAxis(i, { values: e.target.value.split(",").map((x) => x.trim()) })}
                />
                <span>{l.valuesHint}</span>
              </label>
            </div>
          ))}
          {axes.length < MAX_AXES ? (
            <button
              type="button"
              className={addBtn}
              onClick={() => setAxes((x) => [...x, { name: "", style: "boxes", values: [] }])}
            >
              <Plus aria-hidden="true" className="size-4" /> {l.addAxis}
            </button>
          ) : null}
        </fieldset>
      )}

      {rows.length && axes.length ? (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-semibold text-foreground">{l.variants}</legend>
          <p className="text-xs text-muted-foreground">{l.variantsHint}</p>
          {grid.length > MAX_VARIANTS ? (
            <p role="alert" className="text-sm text-error-text">
              {l.tooMany}
            </p>
          ) : null}
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-left text-sm [&_td]:border-t [&_td]:border-border [&_td]:p-2 [&_th]:p-2 [&_th]:text-xs [&_th]:text-muted-foreground">
              <thead>
                <tr>
                  <th>{l.include}</th>
                  {axes.map((a, i) => (
                    <th key={i}>{a.name}</th>
                  ))}
                  <th>{l.price}</th>
                  <th>{l.onRequest}</th>
                  <th>{l.note}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((options) => {
                  const k = variantKey(axes, options);
                  const v = byKey[k] ?? { options, price: "", onRequest: false, note: "", included: false };
                  const name = Object.values(options).join(" · ");
                  return (
                    <tr key={k} className={v.included ? "" : "opacity-60"}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`${l.include} ${name}`}
                          className="size-4.5 accent-primary"
                          checked={v.included}
                          onChange={(e) => setRow(options, { included: e.target.checked })}
                        />
                      </td>
                      {axes.map((a, i) => (
                        <td key={i} className="whitespace-nowrap text-heading">
                          {options[a.name]}
                        </td>
                      ))}
                      <td>
                        <Input
                          aria-label={`${l.price} ${name}`}
                          inputMode="decimal"
                          className="w-28"
                          value={v.price}
                          disabled={v.onRequest}
                          onChange={(e) => setRow(options, { price: e.target.value, included: true })}
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`${l.onRequest} ${name}`}
                          className="size-4.5 accent-primary"
                          checked={v.onRequest}
                          onChange={(e) => setRow(options, { onRequest: e.target.checked, included: true })}
                        />
                      </td>
                      <td>
                        <Input
                          aria-label={`${l.note} ${name}`}
                          maxLength={160}
                          value={v.note}
                          onChange={(e) => setRow(options, { note: e.target.value })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </fieldset>
      ) : null}
    </div>
  );
}
