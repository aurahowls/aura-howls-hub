import { cn } from "@/lib/utils";

/**
 * AuraHowls verification badge — a red wolf head, deep red (#DC2626),
 * with a subtle red glow. Shown next to verified wolves' usernames.
 */
export function VerifiedBadge({
  className,
  size = 16,
  title = "Verified Wolf",
}: {
  className?: string;
  size?: number;
  title?: string;
}) {
  return (
    <span
      title={title}
      aria-label={title}
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        className,
      )}
      style={{
        width: size,
        height: size,
        filter: "drop-shadow(0 0 4px rgba(220,38,38,0.65))",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="#DC2626"
        aria-hidden
      >
        {/* Stylized wolf head */}
        <path d="M12 2.2 8.6 5.4 4 4.6l1.2 4.5L2.4 12l2.8 2.9-1.2 4.5 4.6-.8L12 21.8l3.4-3.2 4.6.8-1.2-4.5L21.6 12l-2.8-2.9 1.2-4.5-4.6.8L12 2.2z" />
        {/* Eyes (cut-out) */}
        <circle cx="9.3" cy="11.2" r="1" fill="#0b0b0b" />
        <circle cx="14.7" cy="11.2" r="1" fill="#0b0b0b" />
        {/* Snout */}
        <path d="M12 13.4l-1.4 2 1.4 1.2 1.4-1.2-1.4-2z" fill="#0b0b0b" />
      </svg>
    </span>
  );
}

export function MaybeVerified({
  verified,
  size = 14,
  className,
}: {
  verified?: boolean | null;
  size?: number;
  className?: string;
}) {
  if (!verified) return null;
  return <VerifiedBadge size={size} className={className} />;
}