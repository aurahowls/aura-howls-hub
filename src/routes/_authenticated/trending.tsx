import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { HowlCard, HowlSkeleton } from "@/components/HowlCard";
import { Flame, Hash, Users as UsersIcon, Film } from "lucide-react";
import {
  fetchTrendingHowls,
  fetchTrendingVideos,
  fetchTrendingHashtags,
  fetchTrendingUsers,
} from "@/lib/trending";
import type { HowlRecord } from "@/lib/howls";
import type { ProfileSummary } from "@/lib/profiles";
import type { HashtagSummary } from "@/lib/search";
import { FollowButton } from "@/components/FollowButton";
import { MaybeVerified } from "@/components/VerifiedBadge";

export const Route = createFileRoute("/_authenticated/trending")({
  component: TrendingPage,
});

function TrendingPage() {
  const [howls, setHowls] = useState<HowlRecord[]>([]);
  const [videos, setVideos] = useState<HowlRecord[]>([]);
  const [tags, setTags] = useState<HashtagSummary[]>([]);
  const [users, setUsers] = useState<ProfileSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      fetchTrendingHowls(10),
      fetchTrendingVideos(6),
      fetchTrendingHashtags(10),
      fetchTrendingUsers(6),
    ]).then(([h, v, t, u]) => {
      if (!alive) return;
      setHowls(h);
      setVideos(v);
      setTags(t);
      setUsers(u);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <AppShell>
      <header className="mb-6 flex items-center gap-3">
        <Flame className="h-7 w-7 text-primary" />
        <h1 className="font-display text-3xl font-bold">Trending</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="glass-card rounded-3xl p-5 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold">
            <Flame className="h-4 w-4 text-primary" /> Top 10 Howls
          </h2>
          <div className="space-y-3">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <HowlSkeleton key={i} />)
              : howls.length === 0
              ? <p className="text-sm text-muted-foreground">No trending Howls yet. Be the first.</p>
              : howls.map((h) => <HowlCard key={h.id} howl={h} />)}
          </div>
        </section>

        <div className="space-y-6">
          <section className="glass-card rounded-3xl p-5">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
              <Hash className="h-4 w-4 text-primary" /> Trending hashtags
            </h2>
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hashtags trending yet.</p>
            ) : (
              <ul className="space-y-2">
                {tags.map((t, i) => (
                  <li key={t.tag}>
                    <Link
                      to="/hashtag/$tag"
                      params={{ tag: t.tag }}
                      className="block rounded-xl p-2 hover:bg-muted/50"
                    >
                      <p className="text-xs text-muted-foreground">#{i + 1}</p>
                      <p className="font-semibold">#{t.tag}</p>
                      <p className="text-xs text-muted-foreground">{t.howl_count} Howls</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="glass-card rounded-3xl p-5">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
              <UsersIcon className="h-4 w-4 text-primary" /> Trending wolves
            </h2>
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trending wolves yet.</p>
            ) : (
              <ul className="space-y-3">
                {users.map((u) => (
                  <li key={u.id} className="flex items-center gap-3">
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
                      <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
                    </div>
                    <FollowButton targetId={u.id} initialFollowing={false} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="glass-card rounded-3xl p-5">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
              <Film className="h-4 w-4 text-primary" /> Trending videos
            </h2>
            {videos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trending videos yet.</p>
            ) : (
              <div className="space-y-3">
                {videos.slice(0, 3).map((h) => (
                  <HowlCard key={h.id} howl={h} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}