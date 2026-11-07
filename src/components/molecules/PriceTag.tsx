type PriceTagProps = {
  price: string; // já formatado em USDT (RN-12)
  estimate: string; // "≈ R$ 2,03" (RN-18), calculado no servidor
  original?: string; // preço sem promoção, riscado (RN-22)
  unit?: string;
};

// Só exibe: o servidor decide o preço (docs/04 — "O front só exibe")
export function PriceTag({ price, estimate, original, unit }: PriceTagProps) {
  return (
    <div>
      <div className="font-heading text-xl font-bold text-heading">
        {original ? <s className="mr-1.5 text-sm font-medium text-muted-foreground">{original}</s> : null}
        {price}
      </div>
      <div className="text-[13px] text-muted-foreground">
        {estimate}
        {unit ? ` · ${unit}` : ""}
      </div>
    </div>
  );
}
