import Link from "next/link";
import { GradientCard } from "@/components/molecules/GradientCard";
import { PriceTag } from "@/components/molecules/PriceTag";
import { KindThumb } from "./KindIcon";

export type ProductCardData = {
  href: string;
  name: string;
  kind: "gold" | "raid" | "dungeon";
  region: string;
  price: string;
  estimate: string;
  unit?: string;
};

export function ProductCard({ p }: { p: ProductCardData }) {
  return (
    <GradientCard interactive className="relative">
      <KindThumb kind={p.kind} badge={p.region} />
      <h3 className="mb-2.5 font-heading text-lg font-semibold text-heading">
        {/* link cobre o card inteiro, mas o título continua sendo o texto do link (acessível) */}
        <Link href={p.href} className="after:absolute after:inset-0 after:content-['']">
          {p.name}
        </Link>
      </h3>
      <PriceTag price={p.price} estimate={p.estimate} unit={p.unit} />
    </GradientCard>
  );
}
