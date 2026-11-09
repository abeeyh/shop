import type { ReactNode } from "react";

type Props = { title: string; description?: string; actions?: ReactNode; back?: ReactNode };

// RF-02 (doc 17): cabeçalho igual em todas as telas do painel — título, apoio curto e a ação principal
export function PageHeader({ title, description, actions, back }: Props) {
  return (
    <header className="flex flex-col gap-3">
      {back}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-heading sm:text-3xl">{title}</h1>
          {description ? <p className="max-w-prose text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
