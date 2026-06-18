import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Search as SearchIcon } from "lucide-react";
import { wolves, trending } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search — AuraHowls" },
      { name: "description", content: "Track wolves, Howls, and trending packs." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  return (
    <AppShell rightRail={false}>
      <div className="relative mb-6">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Search Howls, wolves, trails…"
          className="w-full rounded-full border border-border bg-card/60 py-3.5 pl-12 pr-4 text-base outline-none backdrop-blur transition focus:border-primary focus:aura-glow"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="glass-card rounded-3xl p-5">
          <h2 className="mb-4 font-display text-xl font-bold">Wolves to follow</h2>
          <div className="space-y-3">
            {wolves.map((w) => (
              <div key={w.id} className="flex items-center gap-3">
                <img src={w.avatar} alt="" className="h-10 w-10 rounded-full ring-1 ring-border" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{w.name}</p>
                  <p className="truncate text-xs text-muted-foreground">@{w.handle} · {w.packMembers.toLocaleString()} pack</p>
                </div>
                <Button size="sm" className="rounded-full">Follow</Button>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-3xl p-5">
          <h2 className="mb-4 font-display text-xl font-bold">Trending Howls</h2>
          <ul className="space-y-3">
            {trending.map((t, i) => (
              <li key={t.tag} className="flex items-center justify-between rounded-xl p-2 hover:bg-muted/50">
                <div>
                  <p className="text-xs text-muted-foreground">Trending #{i + 1}</p>
                  <p className="font-semibold">{t.tag}</p>
                  <p className="text-xs text-muted-foreground">{t.howls}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}