import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { HowlCard, HowlSkeleton } from "@/components/HowlCard";
import { HowlComposer } from "@/components/HowlComposer";
import { fetchFeed, type HowlRecord } from "@/lib/howls";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/home")({
  component: HomePage,
});

function HomePage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<HowlRecord[]>([]);

  const load = useCallback(async () => {
    try {
      const data = await fetchFeed();
      setItems(data);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load Howls");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Your Den</h1>
        <div className="flex rounded-full border border-border bg-card/60 p-1 text-sm backdrop-blur">
          <button className="rounded-full bg-primary/15 px-4 py-1.5 font-medium text-primary">For You</button>
          <button className="rounded-full px-4 py-1.5 text-muted-foreground hover:text-foreground">Pack</button>
        </div>
      </div>

      <HowlComposer onPosted={load} />

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <HowlSkeleton key={i} />)
        ) : items.length === 0 ? (
          <div className="glass-card rounded-3xl p-10 text-center text-muted-foreground">
            <p className="font-display text-lg text-foreground">The forest is quiet…</p>
            <p className="mt-1 text-sm">Be the first wolf to howl.</p>
          </div>
        ) : (
          items.map((h) => (
            <HowlCard key={h.id} howl={h} onChanged={load} onDeleted={load} />
          ))
        )}
      </div>
    </AppShell>
  );
}