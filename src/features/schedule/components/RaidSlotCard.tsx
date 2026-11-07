import Link from "next/link";
import { Countdown } from "@/components/molecules/Countdown";
import { GradientCard } from "@/components/molecules/GradientCard";
import { LocalTime } from "@/components/molecules/LocalTime";
import { PriceTag } from "@/components/molecules/PriceTag";
import { cn } from "@/lib/utils";

export type RaidSlotCardData = {
  href: string;
  name: string;
  region: string;
  startsAt: string; // ISO UTC
  seatsLabel: string; // "3 vagas" ou "Esgotado" — decidido no servidor (RN-11, RN-16)
  soldOut: boolean;
  price: string;
};

type Props = {
  slot: RaidSlotCardData;
  locale: string; // BCP 47 canônico
  timeZone: string | null;
  serverTimeZone: string;
  serverNow: number;
  labels: { startsIn: string; serverTime: string; details: string };
};

// docs/15 item 5: "Próximas raids" — horário no fuso do cliente + horário do servidor (RN-83)
export function RaidSlotCard({ slot, locale, timeZone, serverTimeZone, serverNow, labels }: Props) {
  return (
    <GradientCard className="relative flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "rounded-full px-3 py-1 font-heading text-xs font-semibold",
            slot.soldOut ? "bg-destructive/15 text-error-text" : "bg-link/15 text-link",
          )}
        >
          {slot.seatsLabel}
        </span>
        <span className="rounded-full bg-muted px-3 py-1 font-heading text-xs font-semibold text-muted-foreground">
          {slot.region}
        </span>
      </div>
      <h3 className="font-heading text-lg font-semibold text-heading">
        <Link href={slot.href} className="after:absolute after:inset-0 after:content-['']">
          {slot.name}
        </Link>
      </h3>
      <div>
        <div className="font-bold text-heading">
          <LocalTime iso={slot.startsAt} locale={locale} timeZone={timeZone} />
        </div>
        <div className="text-xs text-muted-foreground">
          {labels.serverTime}{" "}
          <LocalTime iso={slot.startsAt} locale={locale} timeZone={serverTimeZone} withDay={false} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{labels.startsIn}</span>
        <Countdown until={slot.startsAt} serverNow={serverNow} label={labels.startsIn} />
      </div>
      <PriceTag price={slot.price} />
    </GradientCard>
  );
}
