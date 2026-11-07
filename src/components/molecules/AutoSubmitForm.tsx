"use client";

import Form from "next/form";
import type { ComponentProps } from "react";

// Formulário GET que se envia sozinho ao marcar checkbox/radio ou trocar select.
// Campos de texto/número continuam pedindo Enter ou o botão (não navega a cada tecla).
export function AutoSubmitForm(props: Omit<ComponentProps<typeof Form>, "onChange">) {
  return (
    <Form
      {...props}
      onChange={(e) => {
        const el = e.target as unknown as HTMLInputElement | HTMLSelectElement;
        if (el.tagName === "SELECT" || el.type === "checkbox" || el.type === "radio") {
          e.currentTarget.requestSubmit();
        }
      }}
    />
  );
}
