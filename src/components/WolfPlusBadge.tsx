import { cn } from "@/lib/utils";

export function WolfPlusBadge({ className, size = "sm" }: { className?: string; size?: "xs" | "sm" | "md" }) {
  const sizeClass = size === "xs" ? "text-[9px] px-1 py-0" : size === "md" ? "text-xs px-2.5 py-1" : "text-[10px] px-1.5 py-0.5";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full font-bold tracking-wide",
        "bg-gradient-to-r from-amber-400 to-orange-500 text-black",
        sizeClass,
        className,
      )}
      title="Wolf+ Premium member"
    >
      ✦ Wolf+
    </span>
  );
}

export function BusinessBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full text-[10px] px-1.5 py-0.5 font-bold tracking-wide",
        "bg-blue-500/20 text-blue-400 border border-blue-500/30",
        className,
      )}
      title="Business account"
    >
      🏢 Business
    </span>
  );
}

export function CreatorBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full text-[10px] px-1.5 py-0.5 font-bold tracking-wide",
        "bg-purple-500/20 text-purple-400 border border-purple-500/30",
        className,
      )}
      title="Creator account"
    >
      ✨ Creator
    </span>
  );
}
