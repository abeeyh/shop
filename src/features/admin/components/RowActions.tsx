import Link from "next/link";
import { buttonVariants } from "@/components/atoms/Button";
import { deleteLabels, type AdminT } from "../labels";
import { DeleteEntity } from "./DeleteEntity";

// Doc 11 §8: coluna de ações da lista — Editar (página própria) e Excluir (confirma e só marca: RN-72)
export function RowActions(p: {
  entity: "category" | "tag" | "product" | "promotion" | "coupon";
  id: string;
  name: string;
  href: string;
  locale: string;
  t: AdminT;
}) {
  return (
    <div className="flex flex-wrap items-start justify-end gap-1">
      <Link
        href={p.href}
        aria-label={`${p.t("form.editLink")} ${p.name}`}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        {p.t("form.editLink")}
      </Link>
      <DeleteEntity
        compact
        entity={p.entity}
        id={p.id}
        name={p.name}
        locale={p.locale}
        labels={deleteLabels(p.t, p.name)}
      />
    </div>
  );
}
