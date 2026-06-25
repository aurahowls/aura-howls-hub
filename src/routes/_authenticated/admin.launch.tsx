import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Rocket, CheckCircle2, XCircle, Clock, Shield, Database, Globe,
  Smartphone, BarChart2, DollarSign, Users, Loader2, Copy,
  Trash2, Plus,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useModRole } from "@/hooks/use-mod-role";
import { fetchPlatformStats, type PlatformStats, formatMoney } from "@/lib/monetization";
import { generateInviteCode, fetchInviteCodes, deleteInviteCode, type InviteCode } from "@/lib/invite";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/launch")({
  head: () => ({ meta: [{ title: "Launch Checklist — AuraHowls Admin" }] }),
  component: LaunchChecklistPage,
});

interface CheckItem {
  id: string;
  label: string;
  description: string;
  status: "done" | "pending" | "warning";
  category: string;
}

const CHECKLIST: CheckItem[] = [
  // Auth & Security
  { id: "auth-email-verify", label: "Email verification enabled", description: "Supabase Auth email confirmation is configured.", status: "done", category: "Security" },
  { id: "auth-password-recovery", label: "Password recovery flow", description: "/forgot-password and /reset-password routes live.", status: "done", category: "Security" },
  { id: "auth-session-mgmt", label: "Session management", description: "Users can log out all devices from settings.", status: "done", category: "Security" },
  { id: "auth-rls", label: "Row-Level Security on all tables", description: "All Supabase tables have RLS policies enabled.", status: "done", category: "Security" },
  { id: "auth-rate-limit", label: "Rate limiting", description: "Howls 5/5min, Echoes 15/5min, DMs 30/5min.", status: "done", category: "Security" },
  { id: "auth-spam", label: "Anti-spam (duplicate detection)", description: "Duplicate Howl detection within 10-minute window.", status: "done", category: "Security" },
  // Database
  { id: "db-backups", label: "Supabase automated backups", description: "Point-in-time recovery via Supabase dashboard.", status: "warning", category: "Database" },
  { id: "db-indexes", label: "Performance indexes", description: "Indexes on feeds, follows, howls, tips, notifications.", status: "done", category: "Database" },
  { id: "db-migrations", label: "All migrations applied", description: "Phases 1–4 migrations committed to supabase/migrations/.", status: "done", category: "Database" },
  // Features
  { id: "feat-feed", label: "Home feed (For You + Following)", description: "Algorithmic and chronological feeds working.", status: "done", category: "Features" },
  { id: "feat-howls", label: "Howls (text, images, video, polls)", description: "Full Howl creation with media and polls.", status: "done", category: "Features" },
  { id: "feat-reels", label: "Wolf Reels (short videos)", description: "Vertical reel feed with video playback.", status: "done", category: "Features" },
  { id: "feat-pack", label: "Pack (follows, suggestions)", description: "Follow system, follower/following pages.", status: "done", category: "Features" },
  { id: "feat-dms", label: "Pack DMs (messaging)", description: "Direct messages with media support.", status: "done", category: "Features" },
  { id: "feat-notifications", label: "Wolf Alerts (notifications)", description: "Real-time notifications via Supabase.", status: "done", category: "Features" },
  { id: "feat-search", label: "Search (users, hashtags, howls)", description: "Full-text search across the platform.", status: "done", category: "Features" },
  { id: "feat-moderation", label: "Moderation & reporting", description: "Report system, mod dashboard, bans, warnings.", status: "done", category: "Features" },
  { id: "feat-privacy", label: "User privacy controls", description: "Private account, hide online, restrict DMs/mentions.", status: "done", category: "Features" },
  { id: "feat-verification", label: "Verification system", description: "Verified badge application and review queue.", status: "done", category: "Features" },
  // Monetization
  { id: "mon-wolf-plus", label: "Wolf+ Premium (UI ready)", description: "Wolf+ page and DB tables ready. Payment gateway TBD.", status: "warning", category: "Monetization" },
  { id: "mon-creator-subs", label: "Creator subscriptions (UI ready)", description: "Creator plan DB and settings page ready. Payment TBD.", status: "warning", category: "Monetization" },
  { id: "mon-tips", label: "Wolf Tips system", description: "Tip button, leaderboard, and DB schema live.", status: "done", category: "Monetization" },
  { id: "mon-promoted", label: "Promoted Howls", description: "Promotion system and sponsored label in feed.", status: "done", category: "Monetization" },
  { id: "mon-business", label: "Business profiles", description: "Business account type, badge, and info fields.", status: "done", category: "Monetization" },
  { id: "mon-payment-gateway", label: "Payment gateway connected", description: "Stripe or equivalent must be integrated before launch.", status: "pending", category: "Monetization" },
  // SEO & Discoverability
  { id: "seo-meta", label: "Meta tags & Open Graph", description: "OG title, description, image on all key pages.", status: "done", category: "SEO" },
  { id: "seo-robots", label: "robots.txt", description: "robots.txt file in public/ directory.", status: "warning", category: "SEO" },
  { id: "seo-sitemap", label: "Sitemap", description: "sitemap.xml for search engine indexing.", status: "pending", category: "SEO" },
  // Mobile & PWA
  { id: "pwa-manifest", label: "PWA manifest", description: "manifest.webmanifest with icons and theme color.", status: "done", category: "Mobile/PWA" },
  { id: "pwa-offline", label: "Offline page", description: "Offline fallback page configured.", status: "done", category: "Mobile/PWA" },
  { id: "pwa-install-prompt", label: "Install prompt", description: "PWA install prompt shown to eligible users.", status: "done", category: "Mobile/PWA" },
  { id: "pwa-push", label: "Push notifications", description: "Push notification service worker to be configured.", status: "pending", category: "Mobile/PWA" },
  // Infrastructure
  { id: "infra-env", label: "Production env vars set", description: "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Render.", status: "warning", category: "Infrastructure" },
  { id: "infra-domain", label: "Custom domain configured", description: "aurahowlshub.com pointed to Render deployment.", status: "pending", category: "Infrastructure" },
  { id: "infra-ssl", label: "SSL certificate", description: "Auto-provisioned by Render on custom domain.", status: "pending", category: "Infrastructure" },
  { id: "infra-error-monitoring", label: "Error monitoring", description: "Error boundary and Lovable error reporting active.", status: "done", category: "Infrastructure" },
];

const STATUS_CONFIG = {
  done: { icon: CheckCircle2, color: "text-emerald-400", label: "Done" },
  pending: { icon: XCircle, color: "text-red-400", label: "Pending" },
  warning: { icon: Clock, color: "text-amber-400", label: "Review" },
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Security: Shield,
  Database: Database,
  Features: Rocket,
  Monetization: DollarSign,
  SEO: Globe,
  "Mobile/PWA": Smartphone,
  Infrastructure: BarChart2,
};

function LaunchChecklistPage() {
  const { isAdmin, isModerator, loading: roleLoading } = useModRole();
  const navigate = useNavigate();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [inviteNotes, setInviteNotes] = useState("");
  const [inviteMaxUses, setInviteMaxUses] = useState("1");
  const [creatingInvite, setCreatingInvite] = useState(false);

  useEffect(() => {
    if (!roleLoading && !isModerator) {
      toast.error("Moderators only");
      navigate({ to: "/home", replace: true });
    }
  }, [roleLoading, isModerator, navigate]);

  useEffect(() => {
    if (!isModerator) return;
    fetchPlatformStats().then(setStats).catch(() => {}).finally(() => setStatsLoading(false));
    if (isAdmin) fetchInviteCodes().then(setInvites).catch(() => {});
  }, [isModerator, isAdmin]);

  const handleGenerateInvite = async () => {
    setCreatingInvite(true);
    try {
      const code = await generateInviteCode({ maxUses: parseInt(inviteMaxUses) || 1, notes: inviteNotes || undefined });
      toast.success(`Invite code: ${code}`);
      setInvites(await fetchInviteCodes());
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleDeleteInvite = async (id: string) => {
    if (!confirm("Delete this invite code?")) return;
    await deleteInviteCode(id);
    setInvites((prev) => prev.filter((c) => c.id !== id));
    toast.success("Invite deleted");
  };

  const categories = [...new Set(CHECKLIST.map((c) => c.category))];
  const doneCount = CHECKLIST.filter((c) => c.status === "done").length;
  const pendingCount = CHECKLIST.filter((c) => c.status === "pending").length;
  const warningCount = CHECKLIST.filter((c) => c.status === "warning").length;
  const readiness = Math.round((doneCount / CHECKLIST.length) * 100);

  if (roleLoading) return (
    <AppShell rightRail={false}><Loader2 className="h-6 w-6 animate-spin" /></AppShell>
  );

  return (
    <AppShell rightRail={false}>
      <header className="mb-6 flex items-center gap-3">
        <Rocket className="h-7 w-7 text-primary" />
        <div>
          <h1 className="font-display text-3xl font-bold">Launch Checklist</h1>
          <p className="text-sm text-muted-foreground">Platform readiness overview for administrators.</p>
        </div>
      </header>

      {/* Readiness score */}
      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        <Card className="glass-card border-primary/30 bg-primary/5 sm:col-span-4 lg:col-span-1">
          <CardContent className="py-5 text-center">
            <p className="text-6xl font-black font-display text-primary">{readiness}%</p>
            <p className="text-sm text-muted-foreground mt-1">Launch Ready</p>
            <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${readiness}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="py-5 text-center">
            <p className="text-3xl font-black font-display text-emerald-400">{doneCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Complete</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="py-5 text-center">
            <p className="text-3xl font-black font-display text-amber-400">{warningCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Need Review</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="py-5 text-center">
            <p className="text-3xl font-black font-display text-red-400">{pendingCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Platform stats */}
      {!statsLoading && stats && (
        <Card className="glass-card mb-8">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-primary" /> Platform Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {[
                { label: "Total wolves", value: stats.total_users.toLocaleString() },
                { label: "New (7d)", value: stats.new_users_7d.toLocaleString() },
                { label: "New (30d)", value: stats.new_users_30d.toLocaleString() },
                { label: "Total Howls", value: stats.total_howls.toLocaleString() },
                { label: "New Howls (7d)", value: stats.new_howls_7d.toLocaleString() },
                { label: "Wolf+ members", value: stats.wolf_plus_count.toLocaleString() },
                { label: "Creators", value: stats.creator_count.toLocaleString() },
                { label: "Businesses", value: stats.business_count.toLocaleString() },
                { label: "Total tips", value: formatMoney(stats.total_tips_cents) },
                { label: "Active subscribers", value: stats.total_subscribers.toLocaleString() },
                { label: "Active promotions", value: stats.active_promotions.toLocaleString() },
                { label: "Active invites", value: stats.invite_codes_active.toLocaleString() },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-border bg-card/30 p-3">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="font-display text-xl font-bold">{s.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checklist by category */}
      <div className="space-y-6">
        {categories.map((cat) => {
          const items = CHECKLIST.filter((c) => c.category === cat);
          const CatIcon = CATEGORY_ICONS[cat] ?? Shield;
          return (
            <Card key={cat} className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <CatIcon className="h-4 w-4 text-primary" /> {cat}
                  <Badge variant="outline" className="ml-auto text-xs">
                    {items.filter((i) => i.status === "done").length}/{items.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.map((item) => {
                  const { icon: StatusIcon, color, label } = STATUS_CONFIG[item.status];
                  return (
                    <div key={item.id} className="flex items-start gap-3 rounded-xl p-3 hover:bg-muted/20 transition-colors">
                      <StatusIcon className={`h-5 w-5 shrink-0 mt-0.5 ${color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`shrink-0 text-[10px] ${item.status === "done" ? "border-emerald-400/30 text-emerald-400" : item.status === "warning" ? "border-amber-400/30 text-amber-400" : "border-red-400/30 text-red-400"}`}
                      >
                        {label}
                      </Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Invite codes (admin only) */}
      {isAdmin && (
        <Card className="glass-card mt-8">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Beta Invite Codes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Notes (e.g. VIP beta tester)"
                value={inviteNotes}
                onChange={(e) => setInviteNotes(e.target.value)}
                className="bg-card max-w-xs"
              />
              <Input
                type="number"
                min="1"
                max="100"
                placeholder="Max uses"
                value={inviteMaxUses}
                onChange={(e) => setInviteMaxUses(e.target.value)}
                className="bg-card w-28"
              />
              <Button onClick={handleGenerateInvite} disabled={creatingInvite} className="btn-gold rounded-full">
                {creatingInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-1 h-4 w-4" /> Generate</>}
              </Button>
            </div>

            {invites.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {invites.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-3 rounded-xl border border-border bg-card/30 px-4 py-2.5">
                    <code className="font-mono text-sm text-primary font-bold">{inv.code}</code>
                    <span className="text-xs text-muted-foreground">{inv.use_count}/{inv.max_uses} uses</span>
                    {inv.notes && <span className="text-xs text-muted-foreground truncate">{inv.notes}</span>}
                    {inv.expires_at && (
                      <span className="text-xs text-muted-foreground ml-auto shrink-0">
                        exp. {new Date(inv.expires_at).toLocaleDateString()}
                      </span>
                    )}
                    <button
                      onClick={() => { navigator.clipboard.writeText(inv.code); toast.success("Copied!"); }}
                      className="shrink-0 p-1 hover:text-primary"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteInvite(inv.id)}
                      className="shrink-0 p-1 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No invite codes yet. Generate one above.</p>
            )}
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
