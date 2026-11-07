import { cva } from "class-variance-authority";

const priceVariants = cva("font-heading font-bold whitespace-nowrap text-gold", {
  variants: { size: { sm: "text-base", md: "text-xl" } },
  defaultVariants: { size: "md" },
});

type PriceTagProps = {
  price: string; // já formatado em USDT (RN-12)
  original?: string; // preço sem promoção, riscado (RN-22)
  unit?: string;
  size?: "sm" | "md";
};

// Só exibe: o servidor decide o preço (docs/04 — "O front só exibe"). #102: preço em ouro (destaque)
export function PriceTag({ price, original, unit, size }: PriceTagProps) {
  return (
    <div>
      <div className={priceVariants({ size })}>
        {original ? <s className="mr-1.5 text-sm font-medium text-muted-foreground">{original}</s> : null}
        {price}
      </div>
      {/* RN-18: estimativa "≈" na moeda local volta com a API de cotação (#63) */}
      {unit ? <div className="text-xs text-muted-foreground">{unit}</div> : null}
    </div>
  );
}
