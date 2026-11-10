"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/features/auth/staff";
import { routing } from "@/i18n/routing";
import { STAFF_STEPS, type StaffStep } from "./rules";
import { advanceOrder } from "./staff";

export type StepState = { status: "idle" | "ok" | "error"; fields: string[] };

const base = z.object({
  locale: z.enum(routing.locales),
  id: z.uuid(),
  step: z.enum(Object.keys(STAFF_STEPS) as [StaffStep, ...StaffStep[]]),
});
// RN-52: concluir exige a prova (link https para o print/log da entrega)
const proof = z.object({
  proofUrl: z.url({ protocol: /^https$/ }).max(500),
  note: z.string().trim().max(1000),
});

// RN-06: suporte e admin movem o pedido; tudo conferido aqui (action é endpoint público)
export async function advance(_prev: StepState, form: FormData): Promise<StepState> {
  const input = base.safeParse(Object.fromEntries(form));
  if (!input.success) return { status: "error", fields: ["generic"] };
  const step = STAFF_STEPS[input.data.step];
  // RN-06: reembolso e falha de pagamento só o admin
  const staff = await requireStaff(input.data.locale, step.admin ? ["admin"] : ["admin", "suporte"]);
  let delivery: z.infer<typeof proof> | undefined;
  if (step.proof) {
    const p = proof.safeParse(Object.fromEntries(form));
    if (!p.success) return { status: "error", fields: ["proofUrl"] };
    delivery = p.data;
  }
  const moved = await advanceOrder(staff.user.id, input.data.id, input.data.step, delivery);
  if (!moved) return { status: "error", fields: ["stale"] }; // outra pessoa já moveu o pedido
  refresh();
  return { status: "ok", fields: [] };
}
