import Link from "next/link";
import { GradientCard } from "@/components/molecules/GradientCard";
import { KindThumb, type Kind } from "./KindIcon";

type Props = { href: string; name: string; description: string; kind: Kind };

export function CategoryCard({ href, name, description, kind }: Props) {
  return (
    <GradientCard interactive className="relative">
      <KindThumb kind={kind} />
      <h3 className="font-heading text-lg font-semibold text-heading">
        <Link href={href} className="after:absolute after:inset-0 after:content-['']">
          {name}
        </Link>
      </h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
    </GradientCard>
  );
}
