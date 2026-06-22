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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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

  async function signOut() {
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
            { label: "New Pack Members", desc: "When a wolf joins your pack." },
            { label: "Echoes on your Howls", desc: "Replies and threads under your Howls." },
            { label: "Rehowls", desc: "When a wolf rehowls your Howl." },
            { label: "Pack DMs", desc: "Direct messages from your pack." },
          ].map((s, i) => (
            <div key={s.label} className="flex items-center justify-between border-t border-border py-4 first:border-t-0 first:pt-0">
              <div>
                <p className="font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
              <Switch defaultChecked={i !== 2} />
            </div>
          ))}
        </section>

        <div className="flex flex-wrap justify-between gap-2">
          <Button type="button" variant="outline" className="rounded-full" onClick={signOut}>
            Log out
          </Button>
          <Link to="/settings/privacy" className="text-sm text-primary hover:underline">
            Privacy & Safety →
          </Link>
          <Button type="submit" disabled={saving} className="btn-gold rounded-full px-6">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
          </Button>
        </div>
      </form>
    </AppShell>
  );
}