import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Search as SearchIcon, Loader2, X, Hash, History, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { FollowButton } from "@/components/FollowButton";
import { HowlCard, HowlSkeleton } from "@/components/HowlCard";
import { MaybeVerified } from "@/components/VerifiedBadge";
import {
  searchUsers,
  searchHowls,
  searchVideos,
  searchHashtags,
  fetchRecentSearches,
  recordRecentSearch,
  clearRecentSearches,
  type HashtagSummary,
} from "@/lib/search";
import { fetchTrendingHashtags } from "@/lib/trending";
import type { HowlRecord } from "@/lib/howls";
import type { ProfileSummary } from "@/lib/profiles";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/search")({
  component: SearchPage,
});

type Tab = "users" | "howls" | "videos" | "hashtags";

function SearchPage() {
  const { user } = useCurrentUser();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<ProfileSummary[]>([]);
  const [howls, setHowls] = useState<HowlRecord[]>([]);
  const [videos, setVideos] = useState<HowlRecord[]>([]);
  const [tags, setTags] = useState<HashtagSummary[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [trending, setTrending] = useState<HashtagSummary[]>([]);

  useEffect(() => {
    if (user?.id) void fetchRecentSearches().then(setRecent);
    void fetchTrendingHashtags(8).then(setTrending);
  }, [user?.id]);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setUsers([]); setHowls([]); setVideos([]); setTags([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const [u, h, v, t2] = await Promise.all([
          searchUsers(term, { verifiedOnly }),
          searchHowls(term),
          searchVideos(term),
          searchHashtags(term),
        ]);
        setUsers(u); setHowls(h); setVideos(v); setTags(t2);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, verifiedOnly]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (term) {
      void recordRecentSearch(term);
      void fetchRecentSearches().then(setRecent);
    }
  };

  const totals = useMemo(
    () => ({ users: users.length, howls: howls.length, videos: videos.length, hashtags: tags.length }),
    [users, howls, videos, tags],
  );

  const empty = !q.trim();

  return (
    <AppShell rightRail={false}>
      <form onSubmit={onSubmit} className="sticky top-[57px] z-20 -mx-4 mb-4 bg-background/80 px-4 py-2 backdrop-blur lg:static lg:mx-0 lg:bg-transparent lg:p-0 lg:pb-4">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            maxLength={120}
            placeholder="Search wolves, Howls, #tags…"
            className="w-full rounded-full border border-border bg-card/60 py-3.5 pl-12 pr-12 text-base outline-none backdrop-blur transition focus:border-primary focus:aura-glow"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
              aria-label="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {loading && (
            <Loader2 className="absolute right-12 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
      </form>

      {empty ? (
        <DiscoverGrid recent={recent} trending={trending} onPick={setQ} onClear={async () => { await clearRecentSearches(); setRecent([]); }} />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex rounded-full border border-border bg-card/60 p-1 text-sm">
              {([
                { id: "users", label: `Users${totals.users ? ` (${totals.users})` : ""}` },
                { id: "howls", label: `Howls${totals.howls ? ` (${totals.howls})` : ""}` },
                { id: "videos", label: `Videos${totals.videos ? ` (${totals.videos})` : ""}` },
                { id: "hashtags", label: `Hashtags${totals.hashtags ? ` (${totals.hashtags})` : ""}` },
              ] as { id: Tab; label: string }[]).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "rounded-full px-3 py-1.5 transition",
                    tab === t.id ? "bg-primary/15 font-medium text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {tab === "users" && (
              <label className="flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="h-3 w-3"
                />
                Verified only
              </label>
            )}
          </div>

          {tab === "users" && <UserResults users={users} loading={loading} />}
          {tab === "howls" && <HowlResults howls={howls} loading={loading} />}
          {tab === "videos" && <HowlResults howls={videos} loading={loading} />}
          {tab === "hashtags" && <HashtagResults tags={tags} />}
        </>
      )}
    </AppShell>
  );
}

function DiscoverGrid({
  recent, trending, onPick, onClear,
}: {
  recent: string[]; trending: HashtagSummary[]; onPick: (q: string) => void; onClear: () => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="glass-card rounded-3xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <History className="h-4 w-4 text-primary" /> Recent
          </h2>
          {recent.length > 0 && (
            <button onClick={onClear} className="text-xs text-muted-foreground hover:text-destructive">Clear</button>
          )}
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent searches.</p>
        ) : (
          <ul className="space-y-1">
            {recent.map((r) => (
              <li key={r}>
                <button
                  onClick={() => onPick(r)}
                  className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-muted/40"
                >
                  {r}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass-card rounded-3xl p-5">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
          <TrendingUp className="h-4 w-4 text-primary" /> Trending searches
        </h2>
        {trending.length === 0 ? (
          <p className="text-sm text-muted-foreground">Hashtags will trend as wolves howl.</p>
        ) : (
          <ul className="space-y-1">
            {trending.map((t, i) => (
              <li key={t.tag}>
                <Link to="/hashtag/$tag" params={{ tag: t.tag }} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-muted/40">
                  <span>
                    <span className="text-xs text-muted-foreground">#{i + 1}</span>{" "}
                    <span className="font-semibold">#{t.tag}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{t.howl_count}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function UserResults({ users, loading }: { users: ProfileSummary[]; loading: boolean }) {
  if (loading && users.length === 0) return <p className="text-sm text-muted-foreground">Searching the woods…</p>;
  if (users.length === 0) return <p className="text-sm text-muted-foreground">No wolves found with that scent.</p>;
  return (
    <div className="space-y-3">
      {users.map((u) => (
        <div key={u.id} className="glass-card flex items-center gap-3 rounded-2xl p-3">
          <img
            src={u.avatar_url ?? `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(u.username)}`}
            alt=""
            className="h-10 w-10 rounded-full ring-1 ring-border object-cover"
          />
          <div className="min-w-0 flex-1">
            <Link
              to="/u/$username"
              params={{ username: u.username }}
              className="flex items-center gap-1 truncate text-sm font-semibold hover:underline"
            >
              {u.display_name ?? u.username}
              <MaybeVerified verified={u.is_verified} size={12} />
            </Link>
            <p className="truncate text-xs text-muted-foreground">@{u.username} · {u.followers_count} pack</p>
          </div>
          <FollowButton targetId={u.id} initialFollowing={false} />
        </div>
      ))}
    </div>
  );
}

function HowlResults({ howls, loading }: { howls: HowlRecord[]; loading: boolean }) {
  if (loading && howls.length === 0) return <HowlSkeleton />;
  if (howls.length === 0) return <p className="text-sm text-muted-foreground">No Howls found.</p>;
  return (
    <div className="space-y-3">
      {howls.map((h) => <HowlCard key={h.id} howl={h} />)}
    </div>
  );
}

function HashtagResults({ tags }: { tags: HashtagSummary[] }) {
  if (tags.length === 0) return <p className="text-sm text-muted-foreground">No matching hashtags.</p>;
  return (
    <ul className="space-y-2">
      {tags.map((t) => (
        <li key={t.tag}>
          <Link to="/hashtag/$tag" params={{ tag: t.tag }} className="glass-card flex items-center gap-3 rounded-2xl p-3 hover:border-primary/40">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-primary"><Hash className="h-5 w-5" /></span>
            <div className="flex-1">
              <p className="font-semibold">#{t.tag}</p>
              <p className="text-xs text-muted-foreground">{t.howl_count} Howl{t.howl_count === 1 ? "" : "s"}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}