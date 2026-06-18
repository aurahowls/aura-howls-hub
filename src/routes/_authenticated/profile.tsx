import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { HowlCard } from "@/components/HowlCard";
import { Button } from "@/components/ui/button";
import { howls } from "@/lib/mock-data";
import { MapPin, CalendarDays, Link2 } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, loading } = useCurrentUser();
  const myHowls = howls.slice(0, 3);

  const displayName = profile?.display_name ?? profile?.username ?? "Wolf";
  const handle = profile?.username ?? "wolf";
  const bio = profile?.bio ?? "Howling at the moon since 2026 🌙";
  const location = profile?.location ?? "Northern Ridge";
  const website = profile?.website ?? "aurahowls.dev";
  const joined = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : "—";
  const avatarUrl =
    profile?.avatar_url ??
    `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(handle)}`;
  const bannerStyle = profile?.banner_url
    ? { background: `url(${profile.banner_url}) center/cover` }
    : { background: "var(--gradient-aura)" };

  return (
    <AppShell rightRail={false}>
      <div className="glass-card overflow-hidden rounded-3xl">
        <div className="relative h-44" style={bannerStyle as React.CSSProperties}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.78_0.16_70/0.6),transparent_60%)]" />
        </div>
        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-3">
            <img src={avatarUrl} alt="" className="h-24 w-24 rounded-full ring-4 ring-card aura-glow" />
            <Link to="/settings">
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
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {location}</span>
              <span className="flex items-center gap-1"><Link2 className="h-4 w-4" /> {website}</span>
              <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" /> Joined {joined}</span>
            </div>
            <div className="mt-4 flex gap-6 text-sm">
              <span><span className="font-bold text-foreground">342</span> <span className="text-muted-foreground">Following Pack</span></span>
              <span><span className="font-bold text-foreground">1,287</span> <span className="text-muted-foreground">Pack Members</span></span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-2 border-b border-border">
        {["Howls", "Echoes", "Rehowls", "Likes"].map((t, i) => (
          <button
            key={t}
            className={`px-4 py-3 text-sm font-medium transition ${
              i === 0 ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {myHowls.map((h) => <HowlCard key={h.id} howl={h} />)}
      </div>
    </AppShell>
  );
}