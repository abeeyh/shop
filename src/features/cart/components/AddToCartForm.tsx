"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { buttonVariants } from "@/components/atoms/Button";
import { Select } from "@/components/atoms/Select";
import { LocalTime } from "@/components/molecules/LocalTime";
import { ChatOpenButton } from "@/features/support";
import { addToCart, quoteItem, type AddState } from "../actions";
import { VariantPicker, type PickerAxis, type PickerVariant } from "./VariantPicker";

type Slot = { id: string; startsAt: string; seats: string; bookable: boolean };
type Addon = { name: string; label: string }; // label já traduzido: "Armor Stack (+25%)"

type Labels = {
  realm: string;
  faction: string;
  alliance: string;
  horde: string;
  character: string;
  characterHint: string;
  quantity: string;
  slot: string;
  addons: string;
  scheduleNote: string; // RN-16: sem horário → agendar com o suporte depois do pagamento
  onRequest: string;
  total: string;
  add: string;
  added: string;
  viewCart: string;
  errors: Record<string, string>;
};

type Props = {
  product: string;
  kind: "gold" | "service";
  locale: string; // código da URL (pt-br) — o servidor formata
  canonicalLocale: string; // BCP 47 para LocalTime
  timeZone: string | null;
  initialQuote: string;
  cartHref: string;
  gold: { min: number; max: number; step: number };
  maxQuantity: number; // serviço: 1 = sem seletor
  addons: Addon[];
  slots: Slot[];
  // #100: eixos e combinações (preço por combinação); null = produto sem variantes
  variants: { axes: PickerAxis[]; list: PickerVariant[]; initialId: string } | null;
  askPrice: { label: string; message: string }; // combinação sob consulta (RN-106): pedir o preço no chat
  labels: Labels;
};

const input =
  "min-h-11 w-full rounded-sm border border-border bg-input px-3.5 text-heading placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-invalid:border-error-text";
const fieldCls = "grid gap-1.5 text-sm";
const labelCls = "font-semibold text-foreground";
const choice =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border bg-input px-4 has-[:checked]:border-primary has-[:checked]:bg-primary/10";

const initial: AddState = { status: "idle", fields: [] };

const initialVariant = (v: Props["variants"]) => v?.list.find((x) => x.id === v.initialId) ?? null;

// RN-16 / RN-17 (#94): quantidade (quando o produto deixa), adicionais e horário — ou o aviso de que a run
// é agendada com o suporte depois do pagamento
function ServiceFields({
  p,
  invalid,
  error,
}: {
  p: Props;
  invalid: (f: string) => boolean;
  error: (f: string) => React.ReactNode;
}) {
  const firstBookable = p.slots.find((s) => s.bookable)?.id;
  return (
    <>
      {p.maxQuantity > 1 ? (
        <label className={fieldCls}>
          <span className={labelCls}>{p.labels.quantity}</span>
          <Select name="quantity" defaultValue="1" aria-invalid={invalid("quantity")}>
            {Array.from({ length: p.maxQuantity }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
          {error("quantity")}
        </label>
      ) : null}

      {p.addons.length ? (
        <fieldset className={fieldCls}>
          <legend className={`${labelCls} mb-1.5`}>{p.labels.addons}</legend>
          {p.addons.map((a) => (
            <label key={a.name} className={choice}>
              <input type="checkbox" name="addon" value={a.name} className="size-4.5 accent-primary" />
              {a.label}
            </label>
          ))}
          {error("addon")}
        </fieldset>
      ) : null}

      {p.slots.length ? (
        <fieldset className={fieldCls}>
          <legend className={`${labelCls} mb-1.5`}>{p.labels.slot}</legend>
          <div className="grid gap-2">
            {p.slots.map((s) => (
              <label key={s.id} className={`${choice} ${s.bookable ? "" : "opacity-50"}`}>
                <input
                  type="radio"
                  name="slotId"
                  value={s.id}
                  disabled={!s.bookable}
                  defaultChecked={s.id === firstBookable}
                  className="size-4.5 accent-primary"
                />
                <span className="flex-1 font-semibold text-heading">
                  <LocalTime iso={s.startsAt} locale={p.canonicalLocale} timeZone={p.timeZone} />
                </span>
                <span className="text-xs text-muted-foreground">{s.seats}</span>
              </label>
            ))}
          </div>
          {error("slotId")}
        </fieldset>
      ) : null}

      {!p.slots.length ? (
        <p className="rounded-md border border-link/30 bg-link/10 p-3 text-sm">{p.labels.scheduleNote}</p>
      ) : null}
    </>
  );
}

// total + botão; combinação sob consulta (RN-106) troca os dois por "pedir o preço no chat" com a escolha
function Submit({
  p,
  variant,
  quote,
  pending,
}: {
  p: Props;
  variant: PickerVariant | null;
  quote: string;
  pending: boolean;
}) {
  if (variant && variant.price === null) {
    const chosen = (p.variants?.axes ?? []).map((a) => variant.options[a.name]).join(" · ");
    return <ChatOpenButton label={p.askPrice.label} message={`${p.askPrice.message} (${chosen})`} />;
  }
  return (
    <>
      <div className="flex items-baseline justify-between border-t border-border pt-4">
        <span>{p.labels.total}</span>
        <output aria-live="polite" className="font-heading text-xl font-bold text-heading">
          {quote}
        </output>
      </div>
      <button type="submit" disabled={pending} className={buttonVariants({ variant: "primary", size: "lg" })}>
        {p.labels.add}
      </button>
    </>
  );
}

// RN-15 a RN-17: o formulário só coleta; o servidor valida, calcula o preço (RN-20) e confere a vaga (RN-11).
// Gold e serviço pedem o mesmo personagem (realm, facção, nome); serviço tem adicionais e horário/agendamento.
export function AddToCartForm(p: Props) {
  const [state, formAction, pending] = useActionState(addToCart, initial);
  const [quote, setQuote] = useState(p.initialQuote);
  const [, startQuote] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  const [variant, setVariant] = useState<PickerVariant | null>(() => initialVariant(p.variants));

  const requote = () => {
    if (!form.current) return;
    const data = new FormData(form.current);
    startQuote(async () => {
      const q = await quoteItem(data);
      if (q) setQuote(q);
    });
  };
  // a variante muda pelo estado do React: o campo escondido só tem o id novo depois de renderizar
  useEffect(requote, [variant?.id]);

  const invalid = (f: string) => state.status === "error" && state.fields.includes(f);
  const error = (f: string) =>
    invalid(f) ? (
      <span id={`err-${f}`} className="text-[13px] text-error-text">
        {p.labels.errors[f]}
      </span>
    ) : null;

  return (
    <form ref={form} action={formAction} className="grid gap-4" onChange={requote}>
      <input type="hidden" name="product" value={p.product} />
      <input type="hidden" name="locale" value={p.locale} />

      {p.variants ? (
        <>
          <VariantPicker
            axes={p.variants.axes}
            variants={p.variants.list}
            initialId={p.variants.initialId}
            onRequestLabel={p.labels.onRequest}
            onSelect={setVariant}
          />
          {error("variant")}
        </>
      ) : null}

      <label className={fieldCls}>
        <span className={labelCls}>{p.labels.realm}</span>
        <input
          name="realm"
          required
          minLength={2}
          maxLength={40}
          className={input}
          aria-invalid={invalid("realm")}
        />
        {error("realm")}
      </label>
      <fieldset className={fieldCls}>
        <legend className={`${labelCls} mb-1.5`}>{p.labels.faction}</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className={choice}>
            <input
              type="radio"
              name="faction"
              value="alliance"
              defaultChecked
              className="size-4.5 accent-primary"
            />
            {p.labels.alliance}
          </label>
          <label className={choice}>
            <input type="radio" name="faction" value="horde" className="size-4.5 accent-primary" />
            {p.labels.horde}
          </label>
        </div>
      </fieldset>
      <label className={fieldCls}>
        <span className={labelCls}>{p.labels.character}</span>
        <input
          name="character"
          required
          minLength={2}
          maxLength={12}
          autoComplete="off"
          className={input}
          aria-invalid={invalid("character")}
          aria-describedby="hint-character"
        />
        <span id="hint-character" className="text-xs text-muted-foreground">
          {p.labels.characterHint}
        </span>
        {error("character")}
      </label>

      {p.kind === "gold" ? (
        <label className={fieldCls}>
          <span className={labelCls}>{p.labels.quantity}</span>
          <input
            name="quantity"
            type="number"
            inputMode="numeric"
            required
            min={p.gold.min}
            max={p.gold.max}
            step={p.gold.step}
            defaultValue={100}
            className={input}
            aria-invalid={invalid("quantity")}
          />
          {error("quantity")}
        </label>
      ) : null}

      {p.kind === "service" ? <ServiceFields p={p} invalid={invalid} error={error} /> : null}

      <Submit p={p} variant={variant} quote={quote} pending={pending} />
      <p role="status" className="min-h-5 text-center text-sm">
        {state.status === "ok" ? (
          <>
            {p.labels.added} ·{" "}
            <Link href={p.cartHref} className="text-link hover:underline">
              {p.labels.viewCart}
            </Link>
          </>
        ) : null}
      </p>
    </form>
  );
}
