import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  DollarSign, Users, Heart, Eye, Repeat2, BarChart2, Megaphone,
  TrendingUp, Star, Loader2, ArrowRight, Lock,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  fetchCreatorDashboard, fetchMyPromotions, fetchMyTipsReceived,
  type CreatorDashboard, type PromotedHowl, type TipRecord, formatMoney,
} from "@/lib/monetization";
import { WolfPlusBadge, CreatorBadge, BusinessBadge } from "@/components/WolfPlusBadge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/creator-dashboard")({
  head: () => ({ meta: [{ title: "Creator Dashboard — AuraHowls" }] }),
  component: CreatorDashboardPage,
});

function StatCard({ label, value, icon: Icon, sub, accent = false }: {
  label: string; value: string | number; icon: React.ElementType; sub?: string; accent?: boolean;
}) {
  return (
    <Card className={accent ? "glass-card border-amber-400/30 bg-amber-400/5" : "glass-card"}>
      <CardHeader className="flex flex-row items-center justify-between pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${accent ? "text-amber-400" : "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        <p className={`font-display text-3xl font-black ${accent ? "text-amber-400" : ""}`}>{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function CreatorDashboardPage() {
  const { profile } = useCurrentUser();
  const [dash, setDash] = useState<CreatorDashboard | null>(null);
  const [promotions, setPromotions] = useState<PromotedHowl[]>([]);
  const [tips, setTips] = useState<TipRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      fetchCreatorDashboard(),
      fetchMyPromotions(),
      fetchMyTipsReceived(10),
    ]).then(([d, p, t]) => {
      if (!alive) return;
      setDash(d);
      setPromotions(p);
      setTips(t);
    }).catch((e) => {
      toast.error(e?.message ?? "Failed to load dashboard");
    }).finally(() => {
      if (alive) setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  if (loading) return (
    <AppShell rightRail={false}>
      <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
    </AppShell>
  );

  const accountType = (profile as any)?.account_type ?? "user";

  return (
    <AppShell rightRail={false}>
      <div className="space-y-8 py-2">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-display text-3xl font-black">Creator Dashboard</h1>
              {accountType === "creator" && <CreatorBadge />}
              {accountType === "business" && <BusinessBadge />}
              {dash?.wolf_plus_active && <WolfPlusBadge />}
            </div>
            <p className="text-sm text-muted-foreground">Your earnings, growth, and content at a glance.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link to="/settings/creator">Edit Creator Profile</Link>
            </Button>
            <Button asChild size="sm" className="btn-gold rounded-full">
              <Link to="/analytics">Analytics</Link>
            </Button>
          </div>
        </div>

        {/* Revenue overview */}
        <section>
          <h2 className="mb-3 font-display text-lg font-bold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-amber-400" /> Revenue
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Tips Received"
              value={formatMoney(dash?.total_tips_cents ?? 0)}
              icon={Heart}
              accent
              sub={`${dash?.tips_count ?? 0} tips total`}
            />
            <StatCard
              label="Tips (Last 30d)"
              value={formatMoney(dash?.tips_30d_cents ?? 0)}
              icon={TrendingUp}
              accent
            />
            <StatCard
              label="Active Subscribers"
              value={dash?.subscriber_count ?? 0}
              icon={Users}
              sub="paying members"
            />
            <StatCard
              label="Wolf+ Status"
              value={dash?.wolf_plus_active ? "Active" : "Inactive"}
              icon={Star}
              sub={dash?.wolf_plus_active ? "Premium member" : "Upgrade for perks"}
            />
          </div>
        </section>

        {/* Content performance */}
        <section>
          <h2 className="mb-3 font-display text-lg font-bold flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary" /> Content Performance
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Howls" value={dash?.howls_count ?? 0} icon={BarChart2} />
            <StatCard label="Total Views" value={(dash?.total_views ?? 0).toLocaleString()} icon={Eye} />
            <StatCard label="Total Likes" value={(dash?.total_likes ?? 0).toLocaleString()} icon={Heart} />
            <StatCard label="Total Echoes" value={(dash?.total_echoes ?? 0).toLocaleString()} icon={Repeat2} />
          </div>
        </section>

        {/* Promotions */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" /> Promoted Howls
            </h2>
            <div className="text-sm text-muted-foreground">
              {dash?.promotions_active ?? 0} active · {(dash?.promotions_impressions ?? 0).toLocaleString()} impressions · {(dash?.promotions_clicks ?? 0).toLocaleString()} clicks
            </div>
          </div>
          {promotions.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                No promoted Howls yet. Promote a Howl from the "…" menu on any of your posts.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {promotions.map((p) => (
                <Card key={p.id} className="glass-card">
                  <CardContent className="py-3 flex flex-wrap items-center gap-3">
                    <Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge>
                    <span className="text-sm text-muted-foreground">Budget: {formatMoney(p.budget_usd_cents)}</span>
                    <span className="text-sm text-muted-foreground">{p.impressions.toLocaleString()} impressions</span>
                    <span className="text-sm text-muted-foreground">{p.clicks.toLocaleString()} clicks</span>
                    {p.expires_at && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        Ends {new Date(p.expires_at).toLocaleDateString()}
                      </span>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Recent tips */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <Heart className="h-5 w-5 text-amber-400" /> Recent Tips
            </h2>
            <Link to="/tips" className="text-sm text-primary hover:underline flex items-center gap-1">
              Leaderboard <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {tips.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                No tips yet. Share your profile to start receiving wolf tips! 🐾
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {tips.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-xl border border-border bg-card/30 px-4 py-3">
                  <Heart className="h-4 w-4 text-amber-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{formatMoney(t.amount_usd_cents)}</p>
                    {t.message && <p className="text-xs text-muted-foreground truncate">"{t.message}"</p>}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(t.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Subscriber-only content callout */}
        {accountType !== "creator" && accountType !== "business" && (
          <Card className="glass-card border-purple-500/20">
            <CardContent className="py-5 flex items-center gap-4">
              <Lock className="h-8 w-8 text-purple-400 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Unlock Creator Features</p>
                <p className="text-sm text-muted-foreground">
                  Switch to a Creator or Business account to offer subscriber-only Howls and earn monthly recurring revenue.
                </p>
              </div>
              <Button asChild size="sm" className="btn-gold rounded-full shrink-0">
                <Link to="/settings/creator">Upgrade</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
