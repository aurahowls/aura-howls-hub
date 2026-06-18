import logoAsset from "@/assets/aurahowls-logo.asset.json";
import { cn } from "@/lib/utils";

export function Logo({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-full overflow-hidden",
        "ring-1 ring-primary/30 aura-glow",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "var(--gradient-aura)" }}
      />
      <img
        src={logoAsset.url}
        alt="AuraHowls"
        className="relative h-full w-full object-cover"
        style={{ mixBlendMode: "screen", filter: "invert(1) contrast(1.2)" }}
      />
    </div>
  );
}

export function LogoWordmark({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-3">
      <Logo size={size} />
      <span className="font-display text-xl font-bold tracking-wide text-gradient-gold">
        AuraHowls
      </span>
    </div>
  );
}