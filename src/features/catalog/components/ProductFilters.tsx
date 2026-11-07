import { Select } from "@/components/atoms/Select";
import { buttonVariants } from "@/components/atoms/Button";
import { AutoSubmitForm } from "@/components/molecules/AutoSubmitForm";
import { Collapsible } from "@/components/molecules/Collapsible";
import { GradientCard } from "@/components/molecules/GradientCard";

type Labels = {
  title: string;
  search: string;
  placeholder: string;
  category: string;
  price: string;
  min: string;
  max: string;
  available: string;
  promo: string;
  sort: string;
  sorts: Record<string, string>;
  apply: string;
};

type Props = {
  action: string;
  values: {
    q: string;
    categories: string[];
    min?: number;
    max?: number;
    available: boolean;
    promo: boolean;
    sort: string;
  };
  categories: { slug: string; name: string }[];
  sorts: string[];
  labels: Labels;
};

const group = "grid gap-2 border-t border-border pt-3.5";
const check = "flex min-h-11 cursor-pointer items-center gap-2.5 text-sm lg:min-h-9";

// RN-101/RN-102: painel de filtros — só envia; o servidor aplica e valida (RN-103)
// quantos filtros estão ligados (aparece no botão recolhido — o cliente sabe que há filtro sem abrir)
const activeCount = (v: Props["values"]) =>
  [v.q, v.min !== undefined, v.max !== undefined, v.available, v.promo].filter(Boolean).length +
  v.categories.length;

export function ProductFilters({ action, values, categories, sorts, labels }: Props) {
  const active = activeCount(values);
  return (
    <GradientCard tone="solid" className="lg:sticky lg:top-24">
      <Collapsible
        summary={
          <h2>
            {labels.title}
            {active ? (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {active}
              </span>
            ) : null}
          </h2>
        }
      >
        <AutoSubmitForm action={action} className="mt-3.5 grid gap-3.5" aria-label={labels.title}>
          <label className="grid gap-1.5 text-sm">
            <span className="font-semibold text-foreground">{labels.search}</span>
            <input
              name="q"
              type="search"
              minLength={2}
              maxLength={80}
              defaultValue={values.q}
              placeholder={labels.placeholder}
              className="min-h-11 rounded-sm border border-border bg-input px-3 text-heading placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
          </label>
          <fieldset className={group}>
            <legend className="mb-1 text-sm font-semibold text-heading">{labels.category}</legend>
            {categories.map((c) => (
              <label key={c.slug} className={check}>
                <input
                  type="checkbox"
                  name="cat"
                  value={c.slug}
                  defaultChecked={values.categories.includes(c.slug)}
                  className="size-4.5 accent-primary"
                />
                {c.name}
              </label>
            ))}
          </fieldset>
          <fieldset className={group}>
            <legend className="mb-1 text-sm font-semibold text-heading">{labels.price}</legend>
            <div className="flex items-center gap-2">
              {(["min", "max"] as const).map((k) => (
                <label key={k} className="flex-1">
                  <span className="sr-only">{labels[k]}</span>
                  <input
                    name={k}
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    defaultValue={values[k]}
                    placeholder={labels[k]}
                    className="min-h-11 w-full rounded-sm border border-border bg-input px-3 text-heading placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  />
                </label>
              ))}
            </div>
          </fieldset>
          <div className={group}>
            <label className={check}>
              <input
                type="checkbox"
                name="disponivel"
                value="1"
                defaultChecked={values.available}
                className="size-4.5 accent-primary"
              />
              {labels.available}
            </label>
            <label className={check}>
              <input
                type="checkbox"
                name="promo"
                value="1"
                defaultChecked={values.promo}
                className="size-4.5 accent-primary"
              />
              {labels.promo}
            </label>
          </div>
          <label className={group}>
            <span className="text-sm font-semibold text-heading">{labels.sort}</span>
            <Select name="sort" defaultValue={values.sort}>
              {sorts.map((s) => (
                <option key={s} value={s}>
                  {labels.sorts[s]}
                </option>
              ))}
            </Select>
          </label>
          <button type="submit" className={buttonVariants({ variant: "gradient-outline", size: "sm" })}>
            {labels.apply}
          </button>
        </AutoSubmitForm>
      </Collapsible>
    </GradientCard>
  );
}
