import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { AutoSubmitForm } from "@/components/molecules/AutoSubmitForm";
import type { ListFilter } from "../filters";

type Props = {
  base: string;
  filter: ListFilter;
  categories?: { id: string; name: string }[];
  labels: {
    search: string;
    category: string;
    allCategories: string;
    status: string;
    all: string;
    active: string;
    inactive: string;
  };
};

// RF-03 (doc 17): busca + filtros na URL. Select filtra na hora; o texto pede Enter (sem JS: formulário GET)
export function ListFilters({ base, filter, categories, labels }: Props) {
  return (
    <AutoSubmitForm action={base} role="search" className="flex flex-wrap gap-2">
      <Input
        type="search"
        name="q"
        defaultValue={filter.q}
        maxLength={80}
        aria-label={labels.search}
        placeholder={labels.search}
        className="w-56 max-w-full"
      />
      {categories ? (
        <Select name="cat" defaultValue={filter.cat} aria-label={labels.category} className="w-auto">
          <option value="">{labels.allCategories}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      ) : null}
      <Select name="status" defaultValue={filter.status} aria-label={labels.status} className="w-auto">
        <option value="">{labels.all}</option>
        <option value="active">{labels.active}</option>
        <option value="inactive">{labels.inactive}</option>
      </Select>
    </AutoSubmitForm>
  );
}
