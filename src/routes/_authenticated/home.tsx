import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { HowlCard, HowlSkeleton } from "@/components/HowlCard";
import { HowlComposer } from "@/components/HowlComposer";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { FollowButton } from "@/components/FollowButton";
import { fetchForYouFeedPage, fetchFollowingFeedPage, invalidateForYouPool } from "@/lib/feed";
import { fetchSuggestedPack, type ProfileSummary } from "@/lib/profiles";
import type { HowlRecord } from "@/lib/howls";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/home")({
  component: HomePage,
});

type Tab = "foryou" | "following";

function HomePage() {
  const [tab, setTab] = useState<Tab>("foryou");
  const [items, setItems] = useState<HowlRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [suggested, setSuggested] = useState<ProfileSummary[]>([]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const reqIdRef = useRef(0);

  const loadFirst = useCallback(async (which: Tab) => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setItems([]);
    setHasMore(true);
    setPage(0);
    setCursor(undefined);
    try {
      const res =
        which === "foryou"
          ? await fetchForYouFeedPage(0)
          : await fetchFollowingFeedPage(undefined);
      if (reqId !== reqIdRef.current) return;
      setItems(res.items);
      setHasMore(res.hasMore);
      if (which === "foryou") setPage(1);
      else setCursor(res.cursor);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load Howls");
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    const reqId = reqIdRef.current;
    setLoadingMore(true);
    try {
      const res =
        tab === "foryou"
          ? await fetchForYouFeedPage(page)
          : await fetchFollowingFeedPage(cursor);
      if (reqId !== reqIdRef.current) return;
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...res.items.filter((i) => !seen.has(i.id))];
      });
      setHasMore(res.hasMore);
      if (tab === "foryou") setPage((p) => p + 1);
      else setCursor(res.cursor);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }, [tab, page, cursor, hasMore, loading, loadingMore]);

  useEffect(() => {
    void loadFirst(tab);
  }, [tab, loadFirst]);

  useEffect(() => {
    void fetchSuggestedPack(3).then(setSuggested);
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) void loadMore();
      },
      { rootMargin: "400px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  function handlePosted() {
    invalidateForYouPool();
    void loadFirst(tab);
  }

 return (
  <AppShell>
    <h1 style={{ color: "red", fontSize: "50px" }}>
      HOME PAGE TEST
    </h1>
  </AppShell>
);
  ;
}

function EmptyFeed({
  tab,
  suggested,
  onSwitchTab,
}: {
  tab: Tab;
  suggested: ProfileSummary[];
  onSwitchTab: () => void;
}) {
  if (tab === "following") {
    return (
      <div className="glass-card rounded-3xl p-8 text-center">
        <p className="font-display text-lg text-foreground">Your Following Pack is quiet.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Follow some wolves to start hearing their Howls.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Link to="/pack/suggested" className="btn-gold inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium">
            <UserPlus className="h-4 w-4" /> Discover wolves
          </Link>
          <button
            onClick={onSwitchTab}
            className="rounded-full border border-border bg-card/60 px-4 py-2 text-sm font-medium hover:bg-card"
          >
            Switch to For You
          </button>
        </div>
        {suggested.length > 0 && (
          <ul className="mt-6 space-y-3 text-left">
            {suggested.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/40 p-3">
                <img
                  src={p.avatar_url ?? `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(p.username)}`}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover ring-1 ring-primary/30"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.display_name ?? p.username}</p>
                  <p className="truncate text-xs text-muted-foreground">@{p.username}</p>
                </div>
                <FollowButton targetId={p.id} initialFollowing={false} />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  return (
    <div className="glass-card rounded-3xl p-10 text-center text-muted-foreground">
      <p className="font-display text-lg text-foreground">The forest is quiet…</p>
      <p className="mt-1 text-sm">Be the first wolf to howl.</p>
    </div>
  );
}