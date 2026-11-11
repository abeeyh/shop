import type { ReactNode } from "react";
import { BackLink } from "@/components/molecules/BackLink";
import { FormSection } from "@/components/molecules/FormSection";
import { PageHeader } from "@/components/molecules/PageHeader";
import type { SaveState } from "../actions";
import { deleteLabels, formErrors, type AdminT } from "../labels";
import { DeleteEntity } from "./DeleteEntity";
import { EntityForm } from "./EntityForm";

type Props = {
  entity: "category" | "tag" | "product" | "promotion" | "coupon";
  action: (prev: SaveState, form: FormData) => Promise<SaveState>;
  title: string;
  back: { href: string; label: string };
  t: AdminT;
  locale: string;
  edit?: { id: string; name: string }; // ausente = criando
  main: ReactNode;
  aside: ReactNode;
};

// Doc 11 §9: página própria de criar/editar — voltar à lista, formulário em seções e, na edição, zona de perigo
export function EntityFormPage({ entity, action, title, back, t, locale, edit, main, aside }: Props) {
  return (
    <>
      <PageHeader title={title} back={<BackLink href={back.href} label={back.label} />} />
      <EntityForm
        action={action}
        locale={locale}
        id={edit?.id}
        submit={t("form.save")}
        saved={t("form.saved")}
        errors={formErrors(t)}
        cancel={{ href: back.href, label: t("form.cancel") }}
        main={main}
        aside={aside}
      />
      {edit ? (
        <FormSection tone="danger" title={t("form.sec.danger")} hint={t("form.sec.dangerHint")}>
          <div>
            <DeleteEntity entity={entity} id={edit.id} locale={locale} labels={deleteLabels(t, edit.name)} />
          </div>
        </FormSection>
      ) : null}
    </>
  );
}
