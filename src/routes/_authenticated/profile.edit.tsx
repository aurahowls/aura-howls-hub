import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { resolveAvatar, resolveBanner, uploadAvatar, uploadBanner } from "@/lib/profiles";
import { toast } from "sonner";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile/edit")({
  component: EditProfilePage,
});

const schema = z.object({
  display_name: z.string().trim().max(60),
  bio: z.string().trim().max(280),
  location: z.string().trim().max(80),
  website: z.string().trim().max(200),
});

function EditProfilePage() {
  const navigate = useNavigate();
  const { user, profile, loading } = useCurrentUser();
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ display_name: "", bio: "", location: "", website: "" });

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name ?? "",
        bio: profile.bio ?? "",
        location: profile.location ?? "",
        website: profile.website ?? "",
      });
      void (async () => {
        setAvatarUrl(await resolveAvatar(profile.avatar_url));
        setBannerUrl(await resolveBanner(profile.banner_url));
      })();
    }
  }, [profile]);

  async function onAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Avatar must be under 5 MB");
    setUploadingAvatar(true);
    try {
      const path = await uploadAvatar(file);
      setAvatarUrl(await resolveAvatar(path));
      toast.success("Avatar updated 🐺");
    } catch (err: any) {
      toast.error(err.message ?? "Avatar upload failed");
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  }

  async function onBannerPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("Banner must be under 10 MB");
    setUploadingBanner(true);
    try {
      const path = await uploadBanner(file);
      setBannerUrl(await resolveBanner(path));
      toast.success("Banner updated 🌙");
    } catch (err: any) {
      toast.error(err.message ?? "Banner upload failed");
    } finally {
      setUploadingBanner(false);
      e.target.value = "";
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: form.display_name || null,
        bio: form.bio || null,
        location: form.location || null,
        website: form.website || null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    navigate({ to: "/profile" });
  }

  const handle = profile?.username ?? "wolf";
  const fallback = `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(handle)}`;

  return (
    <AppShell rightRail={false}>
      <div className="mb-4 flex items-center gap-3">
        <Link to="/profile" className="rounded-full p-2 hover:bg-muted"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="font-display text-2xl font-bold">Edit Profile</h1>
      </div>

      <form onSubmit={save} className="space-y-6">
        <section className="glass-card overflow-hidden rounded-3xl">
          <div
            className="relative h-44 cursor-pointer"
            style={bannerUrl ? { background: `url(${bannerUrl}) center/cover` } : { background: "var(--gradient-aura)" }}
            onClick={() => bannerInput.current?.click()}
          >
            <div className="absolute inset-0 grid place-items-center bg-background/40 opacity-0 transition hover:opacity-100">
              {uploadingBanner ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
            </div>
            <input ref={bannerInput} type="file" accept="image/*" onChange={onBannerPick} className="hidden" />
          </div>
          <div className="px-6 pb-6">
            <div className="-mt-12 flex items-end gap-3">
              <div className="relative">
                <img
                  src={avatarUrl ?? fallback}
                  alt=""
                  className="h-24 w-24 cursor-pointer rounded-full object-cover ring-4 ring-card aura-glow"
                  onClick={() => avatarInput.current?.click()}
                />
                <button
                  type="button"
                  onClick={() => avatarInput.current?.click()}
                  className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-card"
                  aria-label="Change avatar"
                >
                  {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </button>
                <input ref={avatarInput} type="file" accept="image/*" onChange={onAvatarPick} className="hidden" />
              </div>
              <p className="pb-2 text-xs text-muted-foreground">Tap avatar or banner to upload</p>
            </div>
          </div>
        </section>

        <section className="glass-card rounded-3xl p-6">
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Howl name (username)</Label>
                <Input value={profile?.username ?? ""} disabled />
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
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  maxLength={280}
                  rows={3}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">{form.bio.length}/280</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  maxLength={80}
                  placeholder="Northern Ridge"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  maxLength={200}
                  placeholder="https://yourpack.dev"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                />
              </div>
            </div>
          )}
        </section>

        <div className="flex justify-end gap-2">
          <Link to="/profile">
            <Button type="button" variant="outline" className="rounded-full">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving} className="btn-gold rounded-full px-6">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
          </Button>
        </div>
      </form>
    </AppShell>
  );
}