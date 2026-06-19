import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Search as SearchIcon, Loader2 } from "lucide-react";
import { trending } from "@/lib/mock-data";
import { useEffect, useState } from "react";
import { fetchSuggestedPack, searchProfiles, fetchFollowingIds, type ProfileSummary } from "@/lib/profiles";
import { useCurrentUser } from "@/hooks/use-current-user";
import { FollowButton } from "@/components/FollowButton";

export const Route = createFileRoute("/_authenticated/search")({
  component: SearchPage,
});

function SearchPage() {
  const { user } = useCurrentUser();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ProfileSummary[]>([]);
  const [suggested, setSuggested] = useState<ProfileSummary[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetchSuggestedPack(10).then(setSuggested);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    void fetchFollowingIds(user.id).then((ids) => setFollowingIds(new Set(ids)));
  }, [user?.id]);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults([]);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        setResults(await searchProfiles(term));
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [q]);

  const list = q.trim() ? results : suggested;
  const heading = q.trim() ? "Search results" : "Wolves to follow";

  return (
    <AppShell rightRail={false}>
      <div className="relative mb-6">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={120}
          placeholder="Search wolves by name or @handle…"
          className="w-full rounded-full border border-border bg-card/60 py-3.5 pl-12 pr-4 text-base outline-none backdrop-blur transition focus:border-primary focus:aura-glow"
        />
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="glass-card rounded-3xl p-5">
          <h2 className="mb-4 font-display text-xl font-bold">{heading}</h2>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {q.trim() ? "No wolves found with that scent." : "No suggestions yet."}
            </p>
          ) : (
            <div className="space-y-3">
              {list.map((w) => (
                <div key={w.id} className="flex items-center gap-3">
                  <img
                    src={w.avatar_url ?? `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(w.username)}`}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover ring-1 ring-border"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{w.display_name ?? w.username}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{w.username} · {w.followers_count.toLocaleString()} pack
                    </p>
                  </div>
                  <FollowButton targetId={w.id} initialFollowing={followingIds.has(w.id)} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card rounded-3xl p-5">
          <h2 className="mb-4 font-display text-xl font-bold">Trending Howls</h2>
          <ul className="space-y-3">
            {trending.map((t, i) => (
              <li key={t.tag} className="flex items-center justify-between rounded-xl p-2 hover:bg-muted/50">
                <div>
                  <p className="text-xs text-muted-foreground">Trending #{i + 1}</p>
                  <p className="font-semibold">{t.tag}</p>
                  <p className="text-xs text-muted-foreground">{t.howls}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}