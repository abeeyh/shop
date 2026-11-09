"use client";

import { useState } from "react";
import { Select } from "@/components/atoms/Select";

type Props = {
  categories: { id: string; name: string }[];
  subcategories: { id: string; name: string; categoryId: string }[];
  categoryId: string;
  subcategoryId: string;
  labels: { category: string; subcategory: string; none: string };
};

// RF-12 (doc 17): a subcategoria lista só as da categoria escolhida. O servidor confere de novo (saveProduct).
export function CategorySelects({ categories, subcategories, labels, ...initial }: Props) {
  const [cat, setCat] = useState(initial.categoryId);
  const [sub, setSub] = useState(initial.subcategoryId);
  const options = subcategories.filter((s) => s.categoryId === cat);
  return (
    <>
      <label className="grid gap-1.5 text-sm">
        <span className="font-semibold text-foreground">{labels.category}</span>
        <Select
          name="categoryId"
          required
          value={cat}
          onChange={(e) => {
            setCat(e.target.value);
            setSub(""); // a subcategoria antiga é de outra categoria
          }}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-semibold text-foreground">{labels.subcategory}</span>
        <Select name="subcategoryId" value={sub} onChange={(e) => setSub(e.target.value)}>
          <option value="">{labels.none}</option>
          {options.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </label>
    </>
  );
}
