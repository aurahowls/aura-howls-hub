import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { HowlCard } from "@/components/HowlCard";
import { Button } from "@/components/ui/button";
import { currentWolf, howls } from "@/lib/mock-data";
import { MapPin, CalendarDays, Link2 } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — AuraHowls" },
      { name: "description", content: "Your wolf profile, Howls, and Pack stats." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const myHowls = howls.slice(0, 3);
  return (
    <AppShell rightRail={false}>
      <div className="glass-card overflow-hidden rounded-3xl">
        <div className="relative h-44" style={{ background: "var(--gradient-aura)" }}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.78_0.16_70/0.6),transparent_60%)]" />
        </div>
        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-3">
            <img
              src={currentWolf.avatar}
              alt=""
              className="h-24 w-24 rounded-full ring-4 ring-card aura-glow"
            />
            <Button variant="outline" className="rounded-full border-border bg-card/60">
              Edit Profile
            </Button>
          </div>
          <div className="mt-3">
            <h1 className="font-display text-2xl font-bold">{currentWolf.name}</h1>
            <p className="text-muted-foreground">@{currentWolf.handle}</p>
            <p className="mt-3 text-foreground/90">{currentWolf.bio}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> Northern Ridge</span>
              <span className="flex items-center gap-1"><Link2 className="h-4 w-4" /> aurahowls.dev</span>
              <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" /> Joined Jan 2026</span>
            </div>
            <div className="mt-4 flex gap-6 text-sm">
              <span><span className="font-bold text-foreground">{currentWolf.followingPack}</span> <span className="text-muted-foreground">Following Pack</span></span>
              <span><span className="font-bold text-foreground">{currentWolf.packMembers.toLocaleString()}</span> <span className="text-muted-foreground">Pack Members</span></span>
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