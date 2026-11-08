import { ChevronDown } from "lucide-react";
import Image from "next/image";
import type { ProductContent } from "../content";

// #136: galeria (rola de lado, sem JS), descrição detalhada em parágrafos e FAQ em <details> nativo
export function ProductGallery({ images, label }: { images: ProductContent["images"]; label: string }) {
  if (!images.length) return null;
  return (
    <ul className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto" aria-label={label}>
      {images.map((img) => (
        <li key={img.src} className={images.length > 1 ? "w-[85%] shrink-0 snap-start" : "w-full"}>
          <Image
            src={img.src}
            alt={img.alt}
            width={1200}
            height={675}
            sizes="(min-width: 1024px) 700px, 100vw"
            unoptimized={img.src.endsWith(".svg")} // SVG próprio da loja: sem otimizador
            className="aspect-video w-full rounded-lg border border-border object-cover"
          />
        </li>
      ))}
    </ul>
  );
}

export function ProductDetailsText({ details }: { details: string }) {
  if (!details) return null;
  return (
    <div className="flex flex-col gap-3 text-sm leading-relaxed text-foreground">
      {details.split(/\n{2,}/).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

export function ProductFaq({ faq, title }: { faq: ProductContent["faq"]; title: string }) {
  if (!faq.length) return null;
  return (
    <section aria-labelledby="faq" className="flex flex-col gap-3">
      <h2 id="faq" className="font-heading text-xl font-bold text-heading">
        {title}
      </h2>
      <div className="divide-y divide-border rounded-lg border border-border bg-card">
        {faq.map((f) => (
          <details key={f.q} className="group px-4">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 font-heading font-semibold text-heading focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
              {f.q}
              <ChevronDown
                aria-hidden="true"
                className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
