import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BarChart2, Eye, Heart, Repeat2, MessageCircle, Flame, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { hydrateHowls, formatCount, type HowlRecord } from "@/lib/howls";
import { fetchTrendingHowls } from "@/lib/trending";

export const Route = createFileRoute("/_authenticated/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { user, profile } = useCurrentUser();
  const [howls, setHowls] = useState<HowlRecord[]>([]);
  const [growth, setGrowth] = useState<{ day: string; count: number }[]>([]);
  const [trendingIds, setTrendingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    setLoading(true);
    void (async () => {
      const { data: rows } = await supabase
        .from("howls")
        .select(
          `id, author_id, content, view_count, howl_count, echo_count, rehowl_count, edited, created_at, updated_at,
           media:howl_media ( id, storage_path, media_type, position )`,
        )
        .eq("author_id", user.id)
        .order("created_at", { ascending: false });
      const hydrated = await hydrateHowls(rows ?? []);
      if (!alive) return;
      setHowls(hydrated);

      const { data: follows } = await supabase
        .from("follows")
        .select("created_at")
        .eq("following_id", user.id)
        .order("created_at", { ascending: true });
      const buckets = new Map<string, number>();
      let running = 0;
      const now = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        buckets.set(key, 0);
      }
      for (const f of follows ?? []) {
        const k = f.created_at.slice(0, 10);
        if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
      }
      const total = (follows ?? []).length;
      const startCount = total - [...buckets.values()].reduce((s, v) => s + v, 0);
      running = startCount;
      const series = [...buckets.entries()].map(([day, n]) => ({ day, count: (running += n) }));
      if (!alive) return;
      setGrowth(series);

      const trending = await fetchTrendingHowls(20);
      if (!alive) return;
      setTrendingIds(new Set(trending.map((t) => t.id)));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user?.id]);

  const totals = useMemo(() => {
    let views = 0, likes = 0, rehowls = 0, echoes = 0, videoViews = 0;
    for (const h of howls) {
      views += h.view_count;
      likes += h.howl_count;
      rehowls += h.rehowl_count;
      echoes += h.echo_count;
      if (h.media.some((m) => m.media_type === "video")) videoViews += h.view_count;
    }
    const engagementRate = views ? Math.round(((likes + rehowls + echoes) / Math.max(views, 1)) * 1000) / 10 : 0;
    return { views, likes, rehowls, echoes, videoViews, engagementRate };
  }, [howls]);

  const topHowls = useMemo(
    () => howls.slice().sort((a, b) => (b.howl_count + b.echo_count * 2 + b.view_count * 0.05) - (a.howl_count + a.echo_count * 2 + a.view_count * 0.05)).slice(0, 5),
    [howls],
  );
  const topVideos = useMemo(
    () => howls.filter((h) => h.media.some((m) => m.media_type === "video")).slice().sort((a, b) => b.view_count - a.view_count).slice(0, 5),
    [howls],
  );

  const maxGrowth = Math.max(1, ...growth.map((g) => g.count));

  return (
    <AppShell rightRail={false}>
      <header className="mb-6 flex items-center gap-3">
        <BarChart2 className="h-7 w-7 text-primary" />
        <div>
          <h1 className="font-display text-3xl font-bold">Creator Analytics</h1>
          <p className="text-sm text-muted-foreground">@{profile?.username ?? "wolf"} · last 30 days</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total views" value={totals.views} icon={<Eye className="h-4 w-4" />} />
        <Stat label="Video views" value={totals.videoViews} icon={<Eye className="h-4 w-4" />} />
        <Stat label="🐺 Howls" value={totals.likes} icon={<Heart className="h-4 w-4" />} />
        <Stat label="Echoes" value={totals.echoes} icon={<MessageCircle className="h-4 w-4" />} />
        <Stat label="Rehowls" value={totals.rehowls} icon={<Repeat2 className="h-4 w-4" />} />
        <Stat label="Engagement" value={`${totals.engagementRate}%`} icon={<TrendingUp className="h-4 w-4" />} raw />
        <Stat label="Pack Members" value={profile?.followers_count ?? 0} icon={<Heart className="h-4 w-4" />} />
        <Stat label="Howls posted" value={howls.length} icon={<Flame className="h-4 w-4" />} />
      </div>

      <section className="glass-card mt-6 rounded-3xl p-5">
        <h2 className="mb-4 font-display text-lg font-bold">Pack growth (30 days)</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Crunching numbers…</p>
        ) : (
          <div className="flex h-32 items-end gap-1">
            {growth.map((g) => (
              <div
                key={g.day}
                title={`${g.day}: ${g.count}`}
                className="flex-1 rounded-t-sm bg-gradient-to-t from-primary/40 to-primary"
                style={{ height: `${(g.count / maxGrowth) * 100}%`, minHeight: 2 }}
              />
            ))}
          </div>
        )}
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{growth[0]?.day}</span>
          <span>{growth[growth.length - 1]?.day}</span>
        </div>
      </section>

      <section className="glass-card mt-6 rounded-3xl p-5">
        <h2 className="mb-3 font-display text-lg font-bold">Top performing Howls</h2>
        {topHowls.length === 0 ? (
          <p className="text-sm text-muted-foreground">Howl something to see analytics.</p>
        ) : (
          <ul className="divide-y divide-border">
            {topHowls.map((h) => (
              <li key={h.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm">{h.content ?? <em className="text-muted-foreground">[media]</em>}</p>
                </div>
                {trendingIds.has(h.id) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                    <Flame className="h-3 w-3" /> Trending
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{formatCount(h.view_count)} views · {formatCount(h.howl_count)} 🐺</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass-card mt-6 rounded-3xl p-5">
        <h2 className="mb-3 font-display text-lg font-bold">Top performing videos</h2>
        {topVideos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No video Howls yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {topVideos.map((h) => (
              <li key={h.id} className="flex items-center gap-3 py-3">
                <p className="min-w-0 flex-1 line-clamp-2 text-sm">{h.content ?? <em className="text-muted-foreground">[video]</em>}</p>
                <span className="text-xs text-muted-foreground">{formatCount(h.view_count)} views</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}

function Stat({ label, value, icon, raw }: { label: string; value: number | string; icon: React.ReactNode; raw?: boolean }) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs">{label}</span>
        {icon}
      </div>
      <p className="mt-1 font-display text-2xl font-bold">
        {typeof value === "number" && !raw ? formatCount(value) : value}
      </p>
    </div>
  );
}