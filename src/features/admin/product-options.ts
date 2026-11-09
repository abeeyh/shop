// RF-09 a RF-11 (doc 17): o editor visual do produto monta o MESMO texto que o servidor valida
// (schemas.ts: adicionais "Nome | 25", eixos "Nome | slider | a, b", combinações "Eixo=a; Eixo2=b | 9.99 | nota").
export type Addon = { name: string; percent: string };
export type Axis = { name: string; style: "slider" | "boxes"; values: string[] };
export type Variant = {
  options: Record<string, string>;
  price: string; // USDT digitado ("12.50")
  onRequest: boolean; // RN-106
  note: string;
  included: boolean; // combinação que existe na venda
};

const clean = (s: string) => s.replace(/[|;=\n]/g, " ").trim(); // separadores do formato não entram no texto

export const addonsToText = (list: Addon[]) =>
  list
    .filter((a) => clean(a.name) && a.percent !== "")
    .map((a) => `${clean(a.name)} | ${a.percent}`)
    .join("\n");

export const axisToText = (axes: Axis[]) =>
  axes
    .map((a) => ({ ...a, values: a.values.map((v) => clean(v).replace(/,/g, " ")).filter(Boolean) }))
    .filter((a) => clean(a.name) && a.values.length)
    .map((a) => `${clean(a.name)} | ${a.style} | ${a.values.join(", ")}`)
    .join("\n");

// todas as combinações dos eixos, na ordem dos eixos e dos valores (o "slider" segue a ordem digitada)
export function combos(axes: Axis[]): Record<string, string>[] {
  const valid = axes.filter((a) => clean(a.name) && a.values.some((v) => clean(v)));
  return valid.reduce<Record<string, string>[]>(
    (acc, a) =>
      acc.flatMap((o) => a.values.filter((v) => clean(v)).map((v) => ({ ...o, [clean(a.name)]: clean(v) }))),
    valid.length ? [{}] : [],
  );
}

export const variantKey = (axes: Axis[], options: Record<string, string>) =>
  axes.map((a) => `${clean(a.name)}=${options[clean(a.name)] ?? ""}`).join(";");

export const variantsToText = (axes: Axis[], list: Variant[]) =>
  list
    .map((v) => {
      const opts = axes.map((a) => `${clean(a.name)}=${v.options[clean(a.name)] ?? ""}`).join("; ");
      const price = v.onRequest ? "-" : v.price.trim().replace(",", ".");
      const note = clean(v.note);
      return [opts, price, note].filter((x, i) => i < 2 || x).join(" | ");
    })
    .join("\n");
