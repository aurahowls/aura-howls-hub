import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PackList } from "@/components/PackList";
import { fetchSuggestedPack, type ProfileSummary } from "@/lib/profiles";

export const Route = createFileRoute("/_authenticated/pack/suggested")({
  component: PackSuggested,
});

function PackSuggested() {
  const [members, setMembers] = useState<ProfileSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const m = await fetchSuggestedPack(25);
      if (cancelled) return;
      setMembers(m);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="glass-card rounded-3xl p-8 text-center text-sm text-muted-foreground">Sniffing out new wolves…</div>;
  return <PackList members={members} emptyText="No suggestions right now — the woods are quiet." />;
}