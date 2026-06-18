import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { HowlCard, HowlSkeleton } from "@/components/HowlCard";
import { Button } from "@/components/ui/button";
import { howls } from "@/lib/mock-data";
import { Image, Smile, Sparkles } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/home")({
  component: HomePage,
});

function HomePage() {
  const [loading, setLoading] = useState(true);
  const { profile } = useCurrentUser();
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const avatarUrl =
    profile?.avatar_url ??
    `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(profile?.username ?? "wolf")}`;

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Your Den</h1>
        <div className="flex rounded-full border border-border bg-card/60 p-1 text-sm backdrop-blur">
          <button className="rounded-full bg-primary/15 px-4 py-1.5 font-medium text-primary">For You</button>
          <button className="rounded-full px-4 py-1.5 text-muted-foreground hover:text-foreground">Pack</button>
        </div>
      </div>

      <div className="glass-card mb-4 rounded-3xl p-5">
        <div className="flex gap-3">
          <img src={avatarUrl} alt="" className="h-11 w-11 rounded-full ring-1 ring-primary/40" />
          <div className="min-w-0 flex-1">
            <textarea
              placeholder="What's howling, wolf?"
              maxLength={500}
              className="min-h-[60px] w-full resize-none bg-transparent text-lg outline-none placeholder:text-muted-foreground"
            />
            <div className="mt-2 flex items-center justify-between">
              <div className="flex gap-1 text-primary">
                <button className="rounded-full p-2 hover:bg-primary/10"><Image className="h-4 w-4" /></button>
                <button className="rounded-full p-2 hover:bg-primary/10"><Smile className="h-4 w-4" /></button>
                <button className="rounded-full p-2 hover:bg-primary/10"><Sparkles className="h-4 w-4" /></button>
              </div>
              <Button className="btn-gold rounded-full px-6">Howl</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <HowlSkeleton key={i} />)
          : howls.map((h) => <HowlCard key={h.id} howl={h} />)}
      </div>
    </AppShell>
  );
}