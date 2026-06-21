import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MapPin, CalendarDays, Link2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { HowlCard, HowlSkeleton } from "@/components/HowlCard";
import { FollowButton } from "@/components/FollowButton";
import { MaybeVerified } from "@/components/VerifiedBadge";
import { fetchFeed, fetchMediaHowls, type HowlRecord } from "@/lib/howls";
import {
  fetchLikedHowls,
  fetchProfileByUsername,
  fetchRehowledHowls,
  resolveAvatar,
  resolveBanner,
  isFollowing as checkIsFollowing,
} from "@/lib/profiles";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/u/$username")({
  component: UserProfilePage,
});

type Tab = "howls" | "media" | "likes" | "rehowls";

function UserProfilePage() {
  const { username } = Route.useParams();
  const { user } = useCurrentUser();
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof fetchProfileByUsername>> | null>(null);
  const [tab, setTab] = useState<Tab>("howls");
  const [howls, setHowls] = useState<HowlRecord[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingHowls, setLoadingHowls] = useState(true);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoadingProfile(true);
    void fetchProfileByUsername(username).then(async (p) => {
      if (!alive) return;
      setProfile(p);
      setLoadingProfile(false);
      if (p) {
        setAvatar(await resolveAvatar(p.avatar_url));
        setBanner(await resolveBanner(p.banner_url));
        if (user?.id && user.id !== p.id) setFollowing(await checkIsFollowing(p.id));
      }
    });
    return () => { alive = false; };
  }, [username, user?.id]);

  useEffect(() => {
    if (!profile) return;
    setLoadingHowls(true);
    const run = async () => {
      if (tab === "howls") setHowls(await fetchFeed({ authorId: profile.id }));
      else if (tab === "media") setHowls(await fetchMediaHowls(profile.id));
      else if (tab === "likes") setHowls(await fetchLikedHowls(profile.id));
      else setHowls(await fetchRehowledHowls(profile.id));
      setLoadingHowls(false);
    };
    void run();
  }, [tab, profile]);

  const bannerStyle = useMemo(
    () => (banner ? { background: `url(${banner}) center/cover` } : { background: "var(--gradient-aura)" }),
    [banner],
  );

  if (loadingProfile) {
    return (
      <AppShell><HowlSkeleton /></AppShell>
    );
  }
  if (!profile) {
    return (
      <AppShell>
        <div className="glass-card rounded-3xl p-10 text-center">
          <p className="font-display text-lg">No wolf with the handle @{username}.</p>
        </div>
      </AppShell>
    );
  }

  const isMe = user?.id === profile.id;
  const displayName = profile.display_name ?? profile.username;
  const avatarUrl = avatar ?? `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(profile.username)}`;
  const joined = new Date(profile.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <AppShell rightRail={false}>
      <div className="glass-card overflow-hidden rounded-3xl">
        <div className="relative h-44" style={bannerStyle as React.CSSProperties}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.78_0.16_70/0.4),transparent_60%)]" />
        </div>
        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-3">
            <img src={avatarUrl} alt={displayName} className="h-24 w-24 rounded-full ring-4 ring-card aura-glow object-cover" />
            {isMe ? (
              <Link to="/profile/edit" className="rounded-full border border-border bg-card/60 px-4 py-2 text-sm font-medium hover:bg-card">Edit Profile</Link>
            ) : (
              <FollowButton targetId={profile.id} initialFollowing={following} />
            )}
          </div>
          <div className="mt-3">
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
              {displayName}
              <MaybeVerified verified={profile.is_verified} size={18} />
            </h1>
            <p className="text-muted-foreground">@{profile.username}</p>
            {profile.bio && <p className="mt-3 text-foreground/90">{profile.bio}</p>}
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              {profile.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{profile.location}</span>}
              {profile.website && (
                <a href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary">
                  <Link2 className="h-4 w-4" /> {profile.website.replace(/^https?:\/\//, "")}
                </a>
              )}
              <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" /> Joined {joined}</span>
            </div>
            <div className="mt-4 flex gap-6 text-sm">
              <span><span className="font-bold text-foreground">{profile.following_count}</span> <span className="text-muted-foreground">Following Pack</span></span>
              <span><span className="font-bold text-foreground">{profile.followers_count}</span> <span className="text-muted-foreground">Pack Members</span></span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-2 border-b border-border">
        {([
          { id: "howls", label: "Howls" },
          { id: "media", label: "Media" },
          { id: "likes", label: "Likes" },
          { id: "rehowls", label: "Rehowls" },
        ] as { id: Tab; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-medium transition ${tab === t.id ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {loadingHowls ? (
          Array.from({ length: 2 }).map((_, i) => <HowlSkeleton key={i} />)
        ) : howls.length === 0 ? (
          <div className="glass-card rounded-3xl p-8 text-center text-sm text-muted-foreground">
            Nothing to see in this tab yet.
          </div>
        ) : (
          howls.map((h) => <HowlCard key={h.id} howl={h} />)
        )}
      </div>
    </AppShell>
  );
}