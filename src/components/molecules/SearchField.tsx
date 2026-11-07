import { Search } from "lucide-react";
import Form from "next/form";

type Props = { action: string; label: string; placeholder: string; defaultValue?: string; id: string };

// RN-100: busca no cabeçalho — formulário GET (funciona sem JavaScript; com JS, navegação no cliente)
export function SearchField({ action, label, placeholder, defaultValue, id }: Props) {
  return (
    <Form action={action} role="search" className="relative w-full">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        id={id}
        name="q"
        type="search"
        minLength={2}
        maxLength={80}
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete="off"
        className="min-h-11 w-full rounded-full border border-border bg-input pr-4 pl-10 text-sm text-heading placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:min-h-10"
      />
    </Form>
  );
}
