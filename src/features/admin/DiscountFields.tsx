import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { Check, Field } from "./fields";
import type { AdminT } from "./labels";

export type DiscountValues = {
  type: "percent" | "fixed";
  value: number;
  scope: "store" | "category" | "product";
  categoryId: string | null;
  productId: string | null;
  startsAt: Date;
  endsAt: Date;
  active: boolean;
};

type Option = { id: string; name: string };

const currentDate = () => new Date();

// "2026-11-27T00:00" em UTC para o datetime-local (RN-83: guardado em UTC)
export const toUtcInput = (d: Date) => d.toISOString().slice(0, 16);
export const targetOf = (v: Pick<DiscountValues, "scope" | "categoryId" | "productId">) =>
  v.scope === "store"
    ? "store"
    : v.scope === "category"
      ? `category:${v.categoryId}`
      : `product:${v.productId}`;
export const valueOf = (v: Pick<DiscountValues, "type" | "value">) =>
  v.type === "percent" ? String(v.value) : (v.value / 100).toFixed(2);

// Campos comuns a promoção e cupom (RN-21, RN-25)
export function DiscountFields({
  t,
  v,
  categories,
  products,
}: {
  t: AdminT;
  v: DiscountValues | null;
  categories: Option[];
  products: Option[];
}) {
  const now = currentDate();
  const d = v
    ? { ...v, value: valueOf(v), target: targetOf(v) }
    : {
        type: "percent",
        value: "",
        target: "store",
        startsAt: now,
        endsAt: new Date(now.getTime() + 7 * 86_400_000),
        active: true,
      };
  return (
    <>
      <Field label={t("fields.type")}>
        <Select name="type" defaultValue={d.type}>
          <option value="percent">{t("discount.percent")}</option>
          <option value="fixed">{t("discount.fixed")}</option>
        </Select>
      </Field>
      <Field label={t("fields.value")}>
        <Input name="value" required inputMode="decimal" defaultValue={d.value} />
      </Field>
      <Field label={t("fields.target")}>
        <Select name="target" defaultValue={d.target}>
          <option value="store">{t("discount.store")}</option>
          <optgroup label={t("nav.categories")}>
            {categories.map((c) => (
              <option key={c.id} value={`category:${c.id}`}>
                {c.name}
              </option>
            ))}
          </optgroup>
          <optgroup label={t("nav.products")}>
            {products.map((p) => (
              <option key={p.id} value={`product:${p.id}`}>
                {p.name}
              </option>
            ))}
          </optgroup>
        </Select>
      </Field>
      <Field label={t("fields.startsAt")}>
        <Input name="startsAt" type="datetime-local" required defaultValue={toUtcInput(d.startsAt)} />
      </Field>
      <Field label={t("fields.endsAt")}>
        <Input name="endsAt" type="datetime-local" required defaultValue={toUtcInput(d.endsAt)} />
      </Field>
      <Check label={t("fields.active")} name="active" defaultChecked={d.active} />
    </>
  );
}
