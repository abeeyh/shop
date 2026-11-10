"use client";

import { useState } from "react";
import { Select } from "@/components/atoms/Select";

type Props = {
  tags: { id: string; name: string }[];
  selected: string[]; // na ordem; o primeiro é a tag principal
  labels: { primary: string; others: string; none: string };
};

// #160: tag principal (agrupa a página da categoria) + outras tags. O campo escondido leva os ids na ordem,
// a principal primeiro — o servidor valida (schemas.ts) e o banco recusa id que não existe.
export function TagPicker({ tags, selected, labels }: Props) {
  const [primary, setPrimary] = useState(selected[0] ?? "");
  const [others, setOthers] = useState<string[]>(selected.slice(1));
  const value = [primary, ...others.filter((x) => x !== primary)].filter(Boolean).join(",");
  return (
    <div className="grid gap-3">
      <input type="hidden" name="tags" value={value} />
      <label className="grid gap-1.5 text-sm">
        <span className="font-semibold text-foreground">{labels.primary}</span>
        <Select value={primary} onChange={(e) => setPrimary(e.target.value)}>
          <option value="">{labels.none}</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </label>
      <fieldset className="grid gap-1.5 text-sm">
        <legend className="mb-1 font-semibold text-foreground">{labels.others}</legend>
        <div className="flex flex-wrap gap-2">
          {tags
            .filter((t) => t.id !== primary)
            .map((t) => (
              <label
                key={t.id}
                className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-border px-3 font-semibold text-heading has-[:checked]:border-primary has-[:checked]:bg-primary/15"
              >
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={others.includes(t.id)}
                  onChange={(e) =>
                    setOthers((o) => (e.target.checked ? [...o, t.id] : o.filter((x) => x !== t.id)))
                  }
                />
                {t.name}
              </label>
            ))}
        </div>
      </fieldset>
    </div>
  );
}
