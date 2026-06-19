import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { HowlCard, HowlSkeleton } from "@/components/HowlCard";
import { Button } from "@/components/ui/button";
import { MapPin, CalendarDays, Link2, Users } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchFeed, fetchMediaHowls, type HowlRecord } from "@/lib/howls";
import { fetchLikedHowls, fetchSuggestedPack, resolveAvatar, resolveBanner, type ProfileSummary } from "@/lib/profiles";
import { FollowButton } from "@/components/FollowButton";

export const Route = createFileRoute("/_authenticated/profile/")({
  component: ProfilePage,
});

type Tab = "howls" | "media" | "likes";

function ProfilePage() {
  const { user, profile, loading } = useCurrentUser();
  const [tab, setTab] = useState<Tab>("howls");
  const [howls, setHowls] = useState<HowlRecord[]>([]);
  const [howlsLoading, setHowlsLoading] = useState(true);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [suggested, setSuggested] = useState<ProfileSummary[]>([]);

  useEffect(() => {
    void (async () => {
      setAvatar(await resolveAvatar(profile?.avatar_url ?? null));
      setBanner(await resolveBanner(profile?.banner_url ?? null));
    })();
  }, [profile?.avatar_url, profile?.banner_url]);

  const loadTab = useCallback(async (which: Tab) => {
    if (!user?.id) return;
    setHowlsLoading(true);
    try {
      if (which === "howls") setHowls(await fetchFeed({ authorId: user.id }));
      else if (which === "media") setHowls(await fetchMediaHowls(user.id));
      else setHowls(await fetchLikedHowls(user.id));
    } finally {
      setHowlsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { void loadTab(tab); }, [tab, loadTab]);

  useEffect(() => {
    void (async () => setSuggested(await fetchSuggestedPack(5)))();
  }, [user?.id]);

  const displayName = profile?.display_name ?? profile?.username ?? "Wolf";
  const handle = profile?.username ?? "wolf";
  const bio = profile?.bio ?? "Howling at the moon since 2026 🌙";
  const location = profile?.location;
  const website = profile?.website;
  const joined = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : "—";
  const avatarUrl = avatar ?? `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(handle)}`;
  const bannerStyle = useMemo(
    () => (banner ? { background: `url(${banner}) center/cover` } : { background: "var(--gradient-aura)" }),
    [banner],
  );

  return (
    <AppShell rightRail={false}>
      <div className="glass-card overflow-hidden rounded-3xl">
        <div className="relative h-44" style={bannerStyle as React.CSSProperties}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.78_0.16_70/0.6),transparent_60%)]" />
        </div>
        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-3">
            <img src={avatarUrl} alt={displayName} className="h-24 w-24 rounded-full ring-4 ring-card aura-glow object-cover" />
            <Link to="/profile/edit">
              <Button variant="outline" className="rounded-full border-border bg-card/60">
                Edit Profile
              </Button>
            </Link>
          </div>
          <div className="mt-3">
            <h1 className="font-display text-2xl font-bold">{loading ? "…" : displayName}</h1>
            <p className="text-muted-foreground">@{handle}</p>
            <p className="mt-3 text-foreground/90">{bio}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              {location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {location}</span>}
              {website && (
                <a href={website.startsWith("http") ? website : `https://${website}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary">
                  <Link2 className="h-4 w-4" /> {website.replace(/^https?:\/\//, "")}
                </a>
              )}
              <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" /> Joined {joined}</span>
            </div>
            <div className="mt-4 flex gap-6 text-sm">
              <Link to="/pack/following" className="hover:text-primary">
                <span className="font-bold text-foreground">{profile?.following_count ?? 0}</span>{" "}
                <span className="text-muted-foreground">Following Pack</span>
              </Link>
              <Link to="/pack" className="hover:text-primary">
                <span className="font-bold text-foreground">{profile?.followers_count ?? 0}</span>{" "}
                <span className="text-muted-foreground">Pack Members</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-2 border-b border-border">
        {([
          { id: "howls", label: "Howls" },
          { id: "media", label: "Media" },
          { id: "likes", label: "Likes" },
        ] as { id: Tab; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-medium transition ${
              tab === t.id ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {howlsLoading ? (
          Array.from({ length: 2 }).map((_, i) => <HowlSkeleton key={i} />)
        ) : howls.length === 0 ? (
          <div className="glass-card rounded-3xl p-8 text-center text-sm text-muted-foreground">
            {tab === "howls" && "No Howls yet. Share your first one from the Den."}
            {tab === "media" && "No media Howls yet — try posting an image or video."}
            {tab === "likes" && "No 🐺 Howls yet — like a post to see it here."}
          </div>
        ) : (
          howls.map((h) => (
            <HowlCard key={h.id} howl={h} onChanged={() => loadTab(tab)} onDeleted={() => loadTab(tab)} />
          ))
        )}
      </div>

      <section className="glass-card mt-8 rounded-3xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold">
            <Users className="h-4 w-4 text-primary" /> Suggested Pack Members
          </h3>
          <Link to="/pack/suggested" className="text-xs font-medium text-primary hover:underline">
            See all
          </Link>
        </div>
        {suggested.length === 0 ? (
          <p className="text-sm text-muted-foreground">No suggestions right now — the woods are quiet.</p>
        ) : (
          <ul className="space-y-3">
            {suggested.map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <img
                  src={p.avatar_url ?? `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(p.username)}`}
                  alt=""
                  className="h-10 w-10 rounded-full ring-1 ring-primary/30 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.display_name ?? p.username}</p>
                  <p className="truncate text-xs text-muted-foreground">@{p.username} · {p.followers_count} pack</p>
                </div>
                <FollowButton targetId={p.id} initialFollowing={false} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}