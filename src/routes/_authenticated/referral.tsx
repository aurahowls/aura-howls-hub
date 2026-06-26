import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, Gift, Users, Star, Loader2, Check, ExternalLink } from "lucide-react";
import {
  getMyReferralCode,
  fetchReferralStats,
  fetchMyReferrals,
  buildReferralUrl,
  copyReferralLink,
  CREDITS_PER_REFERRAL,
  WELCOME_CREDITS,
  type ReferralStats,
  type ReferralEntry,
} from "@/lib/referral";

export const Route = createFileRoute("/_authenticated/referral")({
  head: () => ({
    meta: [{ title: "Invite & Earn — AuraHowls" }],
  }),
  component: ReferralPage,
});

function ReferralPage() {
  const [code, setCode] = useState<string | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<ReferralEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [c, s, r] = await Promise.all([
          getMyReferralCode(),
          fetchReferralStats(),
          fetchMyReferrals(20),
        ]);
        if (cancelled) return;
        setCode(c);
        setStats(s);
        setReferrals(r);
      } catch (err: any) {
        if (!cancelled) toast.error(err?.message ?? "Could not load referral data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function handleCopy() {
    if (!code) return;
    const ok = await copyReferralLink(code);
    if (ok) {
      setCopied(true);
      toast.success("Referral link copied to clipboard 🐺");
      setTimeout(() => setCopied(false), 2500);
    } else {
      toast.error("Could not copy — try selecting the link manually");
    }
  }

  const referralUrl = code ? buildReferralUrl(code) : "";

  return (
    <AppShell rightRail={false}>
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Hero */}
        <div className="glass-card rounded-3xl p-8 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-primary/20">
            <Gift className="h-8 w-8 text-primary" aria-hidden />
          </div>
          <h1 className="font-display text-3xl font-bold">Invite &amp; Earn</h1>
          <p className="mt-2 text-muted-foreground">
            Share your unique link. Every wolf you bring into the pack earns you{" "}
            <strong className="text-primary">{CREDITS_PER_REFERRAL} free days of Wolf+</strong>.
            They get <strong className="text-primary">{WELCOME_CREDITS} bonus days</strong> too.
          </p>
        </div>

        {/* Referral link */}
        <section className="glass-card rounded-3xl p-6">
          <h2 className="mb-4 font-display text-xl font-bold">Your Referral Link</h2>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading referral code" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={referralUrl}
                  aria-label="Your referral link"
                  className="font-mono text-sm"
                  onFocus={(e) => e.target.select()}
                />
                <Button
                  onClick={handleCopy}
                  className={copied ? "btn-gold" : ""}
                  aria-label={copied ? "Link copied" : "Copy referral link"}
                >
                  {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                </Button>
              </div>
              {code && (
                <p className="text-center text-xs text-muted-foreground">
                  Or share your code directly:{" "}
                  <code className="rounded bg-muted px-2 py-0.5 font-mono font-bold text-foreground">
                    {code}
                  </code>
                </p>
              )}
            </div>
          )}
        </section>

        {/* Stats */}
        {stats && (
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-3" aria-label="Referral statistics">
            <StatCard
              icon={<Users className="h-5 w-5" />}
              label="Total Referrals"
              value={stats.total_referrals}
            />
            <StatCard
              icon={<Check className="h-5 w-5" />}
              label="Rewarded"
              value={stats.rewarded_referrals}
            />
            <StatCard
              icon={<Star className="h-5 w-5 text-primary" />}
              label="Wolf+ Days Earned"
              value={stats.credits_as_days}
            />
          </section>
        )}

        {/* How it works */}
        <section className="glass-card rounded-3xl p-6">
          <h2 className="mb-4 font-display text-xl font-bold">How it works</h2>
          <ol className="space-y-3" aria-label="Referral steps">
            {[
              { n: 1, text: "Copy your unique referral link above." },
              { n: 2, text: "Share it with friends, pack members, or anywhere wolves roam." },
              { n: 3, text: "When they sign up and verify, you earn Wolf+ credits automatically." },
              { n: 4, text: `${CREDITS_PER_REFERRAL} days of Wolf+ per confirmed referral. No cap.` },
            ].map((step) => (
              <li key={step.n} className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/20 font-bold text-primary text-sm">
                  {step.n}
                </span>
                <span className="text-sm text-muted-foreground pt-0.5">{step.text}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Referral history */}
        {!loading && referrals.length > 0 && (
          <section className="glass-card rounded-3xl p-6">
            <h2 className="mb-4 font-display text-xl font-bold">Pack Recruits</h2>
            <ul className="space-y-3" aria-label="Recent referrals">
              {referrals.map((r) => {
                const name = r.referred_display_name ?? r.referred_username;
                const avatar =
                  r.referred_avatar_url ??
                  `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(r.referred_username)}`;
                return (
                  <li key={r.id} className="flex items-center gap-3">
                    <img
                      src={avatar}
                      alt={`${name}'s avatar`}
                      className="h-9 w-9 rounded-full object-cover ring-1 ring-border"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{name}</p>
                      <p className="text-xs text-muted-foreground">
                        @{r.referred_username} ·{" "}
                        {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.status === "rewarded"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r.status === "rewarded" ? `+${CREDITS_PER_REFERRAL}d Wolf+` : r.status}
                    </span>
                    <Link
                      to="/u/$username"
                      params={{ username: r.referred_username }}
                      aria-label={`View ${name}'s profile`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {!loading && referrals.length === 0 && (
          <div className="glass-card rounded-3xl p-8 text-center text-muted-foreground">
            <Gift className="mx-auto mb-3 h-10 w-10 opacity-40" aria-hidden />
            <p className="font-medium">No recruits yet</p>
            <p className="mt-1 text-sm">Share your link to start earning Wolf+ days.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="glass-card rounded-2xl p-4 text-center">
      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="font-display text-2xl font-bold">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
