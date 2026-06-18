import { MessageCircle, Repeat2, Share2 } from "lucide-react";
import { useState } from "react";
import type { Howl } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function PawIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <ellipse cx="6" cy="11" rx="2" ry="2.6" />
      <ellipse cx="18" cy="11" rx="2" ry="2.6" />
      <ellipse cx="9.5" cy="6.5" rx="1.8" ry="2.4" />
      <ellipse cx="14.5" cy="6.5" rx="1.8" ry="2.4" />
      <path d="M12 12c-3.5 0-6 2.6-6 5.2 0 2.1 1.7 3.3 3.6 3.3 1.1 0 1.6-.5 2.4-.5s1.3.5 2.4.5c1.9 0 3.6-1.2 3.6-3.3 0-2.6-2.5-5.2-6-5.2z" />
    </svg>
  );
}

export function HowlCard({ howl }: { howl: Howl }) {
  const [liked, setLiked] = useState(!!howl.liked);
  const [count, setCount] = useState(howl.howls);

  return (
    <article className="glass-card group rounded-3xl p-5 transition-all hover:border-primary/40 hover:shadow-[0_0_40px_-12px_oklch(0.78_0.16_70/0.35)]">
      <div className="flex gap-3">
        <img
          src={howl.author.avatar}
          alt=""
          className="h-11 w-11 shrink-0 rounded-full ring-1 ring-border"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="truncate font-semibold">{howl.author.name}</span>
            <span className="truncate text-sm text-muted-foreground">
              @{howl.author.handle} · {howl.createdAt}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/95">
            {howl.content}
          </p>

          <div className="mt-4 flex max-w-md items-center justify-between text-muted-foreground">
            <button className="group/btn flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-secondary/15 hover:text-secondary">
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">{howl.echoes}</span>
            </button>
            <button className="group/btn flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-emerald-500/10 hover:text-emerald-400">
              <Repeat2 className="h-4 w-4" />
              <span className="text-xs">{howl.rehowls}</span>
            </button>
            <button
              onClick={() => {
                setLiked((v) => !v);
                setCount((c) => c + (liked ? -1 : 1));
              }}
              className={cn(
                "flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-primary/10 hover:text-primary",
                liked && "text-primary",
              )}
            >
              <PawIcon className={cn("h-4 w-4 transition-transform", liked && "scale-110")} />
              <span className="text-xs">{count}</span>
            </button>
            <button className="flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-muted hover:text-foreground">
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function HowlSkeleton() {
  return (
    <div className="glass-card rounded-3xl p-5">
      <div className="flex gap-3">
        <div className="h-11 w-11 shrink-0 rounded-full skeleton-shimmer" />
        <div className="flex-1 space-y-3">
          <div className="h-3 w-1/3 rounded skeleton-shimmer" />
          <div className="h-3 w-full rounded skeleton-shimmer" />
          <div className="h-3 w-4/5 rounded skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}