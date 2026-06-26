import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { recordSecurityEvent } from "@/lib/security";
import { getMyReferralCode, buildReferralUrl, copyReferralLink } from "@/lib/referral";
import { toast } from "sonner";
import { Loader2, Shield, Lock, Sparkles, Gift, Copy, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

const profileSchema = z.object({
  display_name: z.string().trim().max(60).nullable().or(z.literal("")),
  bio: z.string().trim().max(280).nullable().or(z.literal("")),
  location: z.string().trim().max(80).nullable().or(z.literal("")),
  website: z.string().trim().max(200).nullable().or(z.literal("")),
  avatar_url: z.string().trim().max(500).url("Must be a valid URL").or(z.literal("")),
  banner_url: z.string().trim().max(500).url("Must be a valid URL").or(z.literal("")),
});

function SettingsPage() {
  const navigate = useNavigate();
  const { profile, user, loading } = useCurrentUser();
  const [saving, setSaving] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(null);
  const [refCopied, setRefCopied] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    bio: "",
    location: "",
    website: "",
    avatar_url: "",
    banner_url: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name ?? "",
        bio: profile.bio ?? "",
        location: profile.location ?? "",
        website: profile.website ?? "",
        avatar_url: profile.avatar_url ?? "",
        banner_url: profile.banner_url ?? "",
      });
    }
  }, [profile]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    const payload = {
      display_name: form.display_name || null,
      bio: form.bio || null,
      location: form.location || null,
      website: form.website || null,
      avatar_url: form.avatar_url || null,
      banner_url: form.banner_url || null,
    };
    const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile updated 🌙");
  }

  useEffect(() => {
    let cancelled = false;
    getMyReferralCode().then((c) => { if (!cancelled) setRefCode(c); });
    return () => { cancelled = true; };
  }, []);

  async function handleCopyRef() {
    if (!refCode) return;
    const ok = await copyReferralLink(refCode);
    if (ok) {
      setRefCopied(true);
      toast.success("Referral link copied 🐺");
      setTimeout(() => setRefCopied(false), 2500);
    } else {
      toast.error("Copy failed — try manually");
    }
  }

  async function signOut() {
    await recordSecurityEvent("logout");
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AppShell rightRail={false}>
      <h1 className="mb-6 font-display text-3xl font-bold">Settings</h1>

      <form onSubmit={save} className="space-y-6">
        <section className="glass-card rounded-3xl p-6">
          <h2 className="mb-4 font-display text-xl font-bold">Profile</h2>
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Howl name (username)</Label>
                <Input value={profile?.username ?? ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={profile?.email ?? user?.email ?? ""} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_name">Display name</Label>
                <Input
                  id="display_name"
                  maxLength={60}
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  maxLength={80}
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  maxLength={280}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  maxLength={200}
                  placeholder="https://"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Joined</Label>
                <Input value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : ""} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatar_url">Profile picture URL</Label>
                <Input
                  id="avatar_url"
                  type="url"
                  placeholder="https://…"
                  value={form.avatar_url}
                  onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="banner_url">Banner image URL</Label>
                <Input
                  id="banner_url"
                  type="url"
                  placeholder="https://…"
                  value={form.banner_url}
                  onChange={(e) => setForm({ ...form, banner_url: e.target.value })}
                />
              </div>
            </div>
          )}
        </section>

        <section className="glass-card rounded-3xl p-6">
          <h2 className="mb-4 font-display text-xl font-bold">Wolf Alerts</h2>
          {[
            { id: "notif-pack-members", label: "New Pack Members", desc: "When a wolf joins your pack." },
            { id: "notif-echoes", label: "Echoes on your Howls", desc: "Replies and threads under your Howls." },
            { id: "notif-rehowls", label: "Rehowls", desc: "When a wolf rehowls your Howl." },
            { id: "notif-dms", label: "Pack DMs", desc: "Direct messages from your pack." },
          ].map((s, i) => (
            <div key={s.id} className="flex items-center justify-between border-t border-border py-4 first:border-t-0 first:pt-0">
              <div>
                <Label htmlFor={s.id} className="font-medium cursor-pointer">{s.label}</Label>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
              <Switch id={s.id} defaultChecked={i !== 2} aria-label={s.label} />
            </div>
          ))}
        </section>

        <div className="flex flex-wrap justify-between gap-2">
          <Button type="button" variant="outline" className="rounded-full" onClick={signOut}>
            Log out
          </Button>
          <div className="flex items-center gap-4">
            <Link to="/settings/privacy" className="flex items-center gap-1 text-sm text-primary hover:underline">
              <Lock className="h-3.5 w-3.5" aria-hidden /> Privacy & Safety
            </Link>
            <Link to="/settings/security" className="flex items-center gap-1 text-sm text-primary hover:underline">
              <Shield className="h-3.5 w-3.5" aria-hidden /> Security
            </Link>
            <Link to="/settings/creator" className="flex items-center gap-1 text-sm text-primary hover:underline">
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> Creator & Business
            </Link>
          </div>
          <Button type="submit" disabled={saving} className="btn-gold rounded-full px-6">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Save Changes"}
          </Button>
        </div>
      </form>

      {/* Referral code card — outside form so it doesn't submit */}
      <section className="glass-card rounded-3xl p-6 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Gift className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="font-display text-xl font-bold">Invite &amp; Earn</h2>
          <Link to="/referral" className="ml-auto text-xs text-primary hover:underline">
            Full dashboard →
          </Link>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">
          Share your link — earn <strong className="text-primary">30 free Wolf+ days</strong> per new wolf you bring in.
        </p>
        {refCode ? (
          <div className="flex gap-2">
            <Input
              readOnly
              value={buildReferralUrl(refCode)}
              aria-label="Your referral link"
              className="font-mono text-xs"
              onFocus={(e) => e.target.select()}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={handleCopyRef}
              aria-label={refCopied ? "Link copied" : "Copy referral link"}
            >
              {refCopied ? <Check className="h-4 w-4 text-emerald-400" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground animate-pulse">Generating your link…</p>
        )}
      </section>
    </AppShell>
  );
}