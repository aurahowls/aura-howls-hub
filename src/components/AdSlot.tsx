import { cn } from "@/lib/utils";

export function AdSlot({
  slotName,
  className,
  label = "Sponsored",
}: {
  slotName: string;
  className?: string;
  label?: string;
}) {
  return (
    <div
      data-ad-slot={slotName}
      className={cn(
        "rounded-2xl border border-border/40 bg-card/30 p-4 text-center text-xs text-muted-foreground/50",
        className,
      )}
    >
      <span className="rounded-full border border-border/30 px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase">
        {label}
      </span>
      <p className="mt-2 text-[11px]">Ad slot: {slotName}</p>
    </div>
  );
}
