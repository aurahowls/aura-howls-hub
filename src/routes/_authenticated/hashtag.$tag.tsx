import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Hash } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { HowlCard, HowlSkeleton } from "@/components/HowlCard";
import { fetchHowlsByHashtag } from "@/lib/search";
import { supabase } from "@/integrations/supabase/client";
import type { HowlRecord } from "@/lib/howls";

export const Route = createFileRoute("/_authenticated/hashtag/$tag")({
  component: HashtagPage,
});

function HashtagPage() {
  const { tag } = Route.useParams();
  const [howls, setHowls] = useState<HowlRecord[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      fetchHowlsByHashtag(tag),
      supabase.from("hashtags").select("howl_count").eq("tag", tag.toLowerCase()).maybeSingle(),
    ]).then(([h, c]) => {
      if (!alive) return;
      setHowls(h);
      setCount(c.data?.howl_count ?? h.length);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [tag]);

  return (
    <AppShell>
      <header className="mb-6 flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Hash className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-3xl font-bold">#{tag}</h1>
          <p className="text-sm text-muted-foreground">
            {(count ?? 0).toLocaleString()} Howl{count === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <HowlSkeleton key={i} />)
        ) : howls.length === 0 ? (
          <div className="glass-card rounded-3xl p-10 text-center text-muted-foreground">
            <p className="font-display text-lg text-foreground">No Howls under #{tag} yet</p>
            <p className="mt-1 text-sm">Be the first wolf to use this hashtag.</p>
          </div>
        ) : (
          howls.map((h) => <HowlCard key={h.id} howl={h} />)
        )}
      </div>
    </AppShell>
  );
}