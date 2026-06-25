import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Loader2, Trophy, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { fetchTipsLeaderboard, formatMoney } from "@/lib/monetization";
import { MaybeVerified } from "@/components/VerifiedBadge";
import { WolfPlusBadge, CreatorBadge, BusinessBadge } from "@/components/WolfPlusBadge";

export const Route = createFileRoute("/_authenticated/tips")({
  head: () => ({ meta: [{ title: "Wolf Tips Leaderboard — AuraHowls" }] }),
  component: TipsPage,
});

interface LeaderEntry {
  recipient_id: string;
  total_cents: number;
  tip_count: number;
  profile?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    is_verified: boolean;
    account_type: string;
    wolf_plus_active: boolean;
  };
}

const MEDAL = ["🥇", "🥈", "🥉"];

function TipsPage() {
  const { user } = useCurrentUser();
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const raw = await fetchTipsLeaderboard(50);
      if (!alive || raw.length === 0) { setLoading(false); return; }
      const ids = raw.map((r) => r.recipient_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_verified, account_type, wolf_plus_active")
        .in("id", ids);
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      if (!alive) return;
      setEntries(raw.map((r) => ({ ...r, profile: profileMap.get(r.recipient_id) as any })));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex items-center gap-3">
          <Trophy className="h-7 w-7 text-amber-400" />
          <div>
            <h1 className="font-display text-3xl font-bold">Wolf Tips Leaderboard</h1>
            <p className="text-sm text-muted-foreground">Top-tipped creators in the Pack</p>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Heart className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-semibold">No tips yet</p>
              <p className="text-sm mt-1">Be the first to tip a creator in the Pack!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {/* Top 3 podium */}
            {entries.slice(0, 3).length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                {entries.slice(0, 3).map((entry, i) => {
                  const p = entry.profile;
                  const handle = p?.username ?? entry.recipient_id.slice(0, 8);
                  const avatar = p?.avatar_url ?? `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(handle)}`;
                  return (
                    <Link
                      key={entry.recipient_id}
                      to="/u/$username"
                      params={{ username: handle }}
                      className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-colors hover:border-primary/40 ${i === 0 ? "border-amber-400/40 bg-amber-400/5" : "border-border"}`}
                    >
                      <span className="text-2xl">{MEDAL[i]}</span>
                      <img src={avatar} alt={handle} className="h-12 w-12 rounded-full object-cover" />
                      <div className="min-w-0 w-full">
                        <p className="font-semibold text-sm truncate">@{handle}</p>
                        <p className="text-amber-400 font-bold text-sm">{formatMoney(entry.total_cents)}</p>
                        <p className="text-xs text-muted-foreground">{entry.tip_count} tips</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Full leaderboard */}
            {entries.map((entry, i) => {
              const p = entry.profile;
              const handle = p?.username ?? entry.recipient_id.slice(0, 8);
              const displayName = p?.display_name ?? handle;
              const avatar = p?.avatar_url ?? `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(handle)}`;
              const isMe = user?.id === entry.recipient_id;
              return (
                <Link
                  key={entry.recipient_id}
                  to="/u/$username"
                  params={{ username: handle }}
                  className={`flex items-center gap-4 rounded-2xl border px-4 py-3 transition-colors hover:border-primary/30 ${isMe ? "border-primary/40 bg-primary/5" : "border-border"}`}
                >
                  <span className="w-7 shrink-0 text-center font-bold text-muted-foreground">
                    {i < 3 ? MEDAL[i] : `${i + 1}`}
                  </span>
                  <img src={avatar} alt={handle} className="h-9 w-9 rounded-full object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-sm truncate">{displayName}</span>
                      {p?.is_verified && <MaybeVerified verified size={13} />}
                      {p?.wolf_plus_active && <WolfPlusBadge size="xs" />}
                      {(p as any)?.account_type === "creator" && <CreatorBadge />}
                      {(p as any)?.account_type === "business" && <BusinessBadge />}
                    </div>
                    <p className="text-xs text-muted-foreground">@{handle}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-amber-400">{formatMoney(entry.total_cents)}</p>
                    <p className="text-xs text-muted-foreground">{entry.tip_count} tips</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
