import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Star, Check, Zap, Shield, Palette, BarChart2, Headphones, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WolfPlusBadge } from "@/components/WolfPlusBadge";
import { getWolfPlusStatus, formatMoney } from "@/lib/monetization";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/premium")({
  head: () => ({
    meta: [
      { title: "Wolf+ Premium — AuraHowls" },
      { name: "description", content: "Upgrade to Wolf+ and unlock exclusive features, themes, and priority support." },
    ],
  }),
  component: PremiumPage,
});

const PERKS = [
  { icon: Star, label: "Exclusive Wolf+ badge on your profile" },
  { icon: Palette, label: "10+ exclusive profile themes & custom aura colors" },
  { icon: BarChart2, label: "Advanced analytics — views, reach, demographics" },
  { icon: Zap, label: "Priority placement in discovery & search" },
  { icon: Shield, label: "Priority moderation & appeals" },
  { icon: Headphones, label: "Dedicated Wolf+ support channel" },
];

const PLANS = [
  { id: "monthly", label: "Monthly", price: 999, per: "/mo", badge: null },
  { id: "annual", label: "Annual", price: 7999, per: "/yr", badge: "Save 33%" },
];

function PremiumPage() {
  const { user } = useCurrentUser();
  const [status, setStatus] = useState<{ active: boolean; tier: string; expires_at: string | null } | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("monthly");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWolfPlusStatus().then(setStatus).finally(() => setLoading(false));
  }, []);

  const handleSubscribe = () => {
    toast.info("Payment gateway coming soon! Wolf+ subscriptions will be available at launch. 🐾");
  };

  if (loading) return (
    <AppShell rightRail={false}>
      <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
    </AppShell>
  );

  return (
    <AppShell rightRail={false}>
      <div className="mx-auto max-w-2xl space-y-8 py-4">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 p-4 shadow-lg shadow-amber-500/30">
            <Star className="h-8 w-8 text-black" />
          </div>
          <h1 className="font-display text-4xl font-black">Wolf+ Premium</h1>
          <p className="text-muted-foreground">Unlock the full power of the Den.</p>
          {status?.active && (
            <div className="flex justify-center">
              <Badge className="bg-amber-400/20 text-amber-400 border-amber-400/30">
                ✦ Active Wolf+ — {status.tier}
                {status.expires_at && ` until ${new Date(status.expires_at).toLocaleDateString()}`}
              </Badge>
            </div>
          )}
        </div>

        {/* Perks */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display text-lg">Everything in Wolf+</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {PERKS.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400/10">
                    <Icon className="h-3.5 w-3.5 text-amber-400" />
                  </span>
                  <span className="text-sm">{label}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Plans */}
        {!status?.active && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold text-center">Choose a plan</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {PLANS.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={cn(
                    "relative rounded-2xl border p-5 text-left transition-all",
                    selectedPlan === plan.id
                      ? "border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-400/10"
                      : "border-border hover:border-amber-400/40",
                  )}
                >
                  {plan.badge && (
                    <span className="absolute -top-2.5 right-4 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-black">
                      {plan.badge}
                    </span>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{plan.label}</span>
                    {selectedPlan === plan.id && (
                      <Check className="h-4 w-4 text-amber-400" />
                    )}
                  </div>
                  <p className="mt-1">
                    <span className="font-display text-3xl font-black">{formatMoney(plan.price)}</span>
                    <span className="text-sm text-muted-foreground">{plan.per}</span>
                  </p>
                </button>
              ))}
            </div>

            <Button
              onClick={handleSubscribe}
              className="btn-gold w-full h-12 rounded-full text-base font-bold"
            >
              ✦ Upgrade to Wolf+ — {formatMoney(PLANS.find(p => p.id === selectedPlan)?.price ?? 999)}/{selectedPlan === "monthly" ? "mo" : "yr"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Cancel anytime. No commitment. Wolf+ launches at platform go-live.
            </p>
          </div>
        )}

        {status?.active && (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-6 text-center space-y-2">
            <WolfPlusBadge size="md" />
            <p className="text-sm text-muted-foreground mt-2">
              You're a Wolf+ member. Thank you for supporting the Pack! 🐾
            </p>
          </div>
        )}

        {/* Creator note */}
        <Card className="glass-card border-purple-500/20">
          <CardContent className="pt-5 text-sm text-muted-foreground">
            <strong className="text-foreground">Are you a creator?</strong> Set up a creator subscription
            in{" "}
            <a href="/settings/creator" className="text-primary underline">Creator Settings</a>{" "}
            to earn from your subscribers and tips.
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
