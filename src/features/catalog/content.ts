// #136: conteúdo da página do serviço (galeria, descrição detalhada, FAQ). Validado na importação
// (scripts/catalog/content.json) e, no futuro, no dashboard (#137). Sem alias "@/": o import.mjs usa.
import { z } from "zod";

// só arquivo da própria loja (public/catalog/…): nada de URL externa nem "//host" (docs/09)
const IMAGE_SRC = /^\/catalog\/[a-z0-9][a-z0-9\-/]*\.(svg|png|jpe?g|webp|avif)$/;

export const productImage = z.object({
  src: z
    .string()
    .regex(IMAGE_SRC)
    .refine((s) => !s.includes("..") && !s.includes("//")),
  alt: z.string().trim().min(3).max(160), // doc 11 §4: toda imagem com texto alternativo
});
export const productFaq = z.object({
  q: z.string().trim().min(5).max(200),
  a: z.string().trim().min(5).max(2000),
});
export const productContent = z.object({
  details: z.string().trim().max(6000).default(""),
  images: z.array(productImage).max(8).default([]),
  faq: z.array(productFaq).max(20).default([]),
});

export type ProductImage = z.infer<typeof productImage>;
export type ProductFaq = z.infer<typeof productFaq>;
export type ProductContent = z.infer<typeof productContent>;
