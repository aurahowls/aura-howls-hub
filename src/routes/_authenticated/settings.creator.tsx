import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Building2, Save, Loader2, Globe, Mail, Phone, DollarSign, Lock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import {
  updateAccountSettings, saveCreatorPlan, fetchCreatorPlan,
  type AccountType, type CreatorPlan, formatMoney,
} from "@/lib/monetization";
import { WolfPlusBadge, CreatorBadge, BusinessBadge } from "@/components/WolfPlusBadge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings/creator")({
  head: () => ({ meta: [{ title: "Creator & Business Settings — AuraHowls" }] }),
  component: CreatorSettingsPage,
});

const ACCOUNT_TYPES: { id: AccountType; label: string; desc: string; badge: React.ReactNode }[] = [
  { id: "user", label: "Standard Wolf", desc: "Personal account — browse, howl, and connect.", badge: null },
  { id: "creator", label: "Creator", desc: "Earn tips and subscriber revenue from your audience.", badge: <CreatorBadge /> },
  { id: "business", label: "Business", desc: "Business presence with contact info, analytics, and a business badge.", badge: <BusinessBadge /> },
];

function CreatorSettingsPage() {
  const { user, profile } = useCurrentUser();
  const [saving, setSaving] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("user");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [plan, setPlan] = useState<CreatorPlan | null>(null);
  const [planPrice, setPlanPrice] = useState("4.99");
  const [planDesc, setPlanDesc] = useState("");
  const [planActive, setPlanActive] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const p = profile as any;
    setAccountType(p.account_type ?? "user");
    setBusinessWebsite(p.business_website ?? "");
    setBusinessEmail(p.business_email ?? "");
    setBusinessPhone(p.business_phone ?? "");
  }, [profile]);

  useEffect(() => {
    if (!user?.id) return;
    fetchCreatorPlan(user.id).then((p) => {
      if (!p) return;
      setPlan(p);
      setPlanPrice((p.price_usd_cents / 100).toFixed(2));
      setPlanDesc(p.description ?? "");
      setPlanActive(p.is_active);
    });
  }, [user?.id]);

  const saveAccountType = async () => {
    setSaving(true);
    try {
      await updateAccountSettings({
        account_type: accountType,
        business_website: businessWebsite || undefined,
        business_email: businessEmail || undefined,
        business_phone: businessPhone || undefined,
      });
      await supabase.auth.refreshSession();
      toast.success("Account type updated!");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const saveCreatorPlanSettings = async () => {
    const priceCents = Math.round(parseFloat(planPrice) * 100);
    if (isNaN(priceCents) || priceCents < 99) {
      toast.error("Minimum subscription price is $0.99/mo");
      return;
    }
    setSaving(true);
    try {
      await saveCreatorPlan(priceCents, planDesc, planActive);
      toast.success("Creator subscription plan saved!");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  const currentType = ACCOUNT_TYPES.find((t) => t.id === accountType);

  return (
    <AppShell rightRail={false}>
      <header className="mb-6 flex items-center gap-3">
        <Sparkles className="h-7 w-7 text-primary" />
        <div>
          <h1 className="font-display text-3xl font-bold">Creator & Business</h1>
          <p className="text-sm text-muted-foreground">Configure your account type, creator plan, and business info.</p>
        </div>
      </header>

      <Tabs defaultValue="account-type" className="space-y-6">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="account-type">Account Type</TabsTrigger>
          <TabsTrigger value="creator-plan">Creator Plan</TabsTrigger>
          <TabsTrigger value="business-info">Business Info</TabsTrigger>
        </TabsList>

        {/* Account Type Tab */}
        <TabsContent value="account-type">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose your account type. You can change this at any time.
            </p>
            <div className="grid gap-3">
              {ACCOUNT_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setAccountType(type.id)}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition-all",
                    accountType === type.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{type.label}</span>
                      {type.badge}
                    </div>
                    {accountType === type.id && (
                      <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-background" />
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{type.desc}</p>
                </button>
              ))}
            </div>
            <Button onClick={saveAccountType} disabled={saving} className="btn-gold rounded-full px-8">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Save Account Type</>}
            </Button>
          </div>
        </TabsContent>

        {/* Creator Plan Tab */}
        <TabsContent value="creator-plan">
          {accountType !== "creator" && accountType !== "business" ? (
            <Card className="glass-card border-muted">
              <CardContent className="py-8 text-center space-y-3">
                <Lock className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="font-semibold">Creator accounts only</p>
                <p className="text-sm text-muted-foreground">Switch to a Creator or Business account to enable subscription plans.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-5">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-amber-400" /> Subscription Plan
                  </CardTitle>
                  <CardDescription>Offer a monthly subscription to your subscribers. They'll get access to your subscriber-only Howls and Pack DMs.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="plan-price" className="mb-1 block text-sm">Monthly price (USD)</Label>
                    <div className="flex items-center gap-2 max-w-xs">
                      <span className="text-muted-foreground text-sm">$</span>
                      <Input
                        id="plan-price"
                        type="number"
                        min="0.99"
                        step="0.50"
                        value={planPrice}
                        onChange={(e) => setPlanPrice(e.target.value)}
                        className="bg-card"
                      />
                      <span className="text-muted-foreground text-sm whitespace-nowrap">/ month</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      You keep ~85% after platform fee. Effective: {formatMoney(Math.round(parseFloat(planPrice || "0") * 85))}/mo per subscriber.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="plan-desc" className="mb-1 block text-sm">What subscribers get</Label>
                    <Textarea
                      id="plan-desc"
                      placeholder="Exclusive Howls, early access to videos, personal Pack DMs..."
                      value={planDesc}
                      onChange={(e) => setPlanDesc(e.target.value)}
                      rows={3}
                      maxLength={500}
                      className="resize-none bg-card"
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-border bg-card/30 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">Enable subscriptions</p>
                      <p className="text-xs text-muted-foreground">Wolves can subscribe to your content</p>
                    </div>
                    <Switch checked={planActive} onCheckedChange={setPlanActive} />
                  </div>

                  <Button onClick={saveCreatorPlanSettings} disabled={saving} className="btn-gold rounded-full px-8">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Save Plan</>}
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    Payment gateway integration required for live subscriptions. Subscribers will be charged at launch.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Business Info Tab */}
        <TabsContent value="business-info">
          {accountType !== "business" ? (
            <Card className="glass-card border-muted">
              <CardContent className="py-8 text-center space-y-3">
                <Building2 className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="font-semibold">Business accounts only</p>
                <p className="text-sm text-muted-foreground">Switch to a Business account to add website and contact info.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-400" /> Business Information
                </CardTitle>
                <CardDescription>Displayed on your profile page for wolves to contact you.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="biz-website" className="mb-1 flex items-center gap-2 text-sm">
                    <Globe className="h-3.5 w-3.5" /> Website
                  </Label>
                  <Input
                    id="biz-website"
                    type="url"
                    placeholder="https://yoursite.com"
                    value={businessWebsite}
                    onChange={(e) => setBusinessWebsite(e.target.value)}
                    className="bg-card"
                  />
                </div>
                <div>
                  <Label htmlFor="biz-email" className="mb-1 flex items-center gap-2 text-sm">
                    <Mail className="h-3.5 w-3.5" /> Business Email
                  </Label>
                  <Input
                    id="biz-email"
                    type="email"
                    placeholder="contact@yourcompany.com"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                    className="bg-card"
                  />
                </div>
                <div>
                  <Label htmlFor="biz-phone" className="mb-1 flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5" /> Phone
                  </Label>
                  <Input
                    id="biz-phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                    className="bg-card"
                  />
                </div>
                <Button onClick={saveAccountType} disabled={saving} className="btn-gold rounded-full px-8">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Save Business Info</>}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
