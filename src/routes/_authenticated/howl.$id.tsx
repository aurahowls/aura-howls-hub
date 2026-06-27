import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { HowlCard } from "@/components/HowlCard";
import { EchoesDialog } from "@/components/EchoesDialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { hydrateHowls, type HowlRecord } from "@/lib/howls";

export const Route = createFileRoute("/_authenticated/howl/$id")({
  head: ({ params }) => ({
    meta: [
      { title: "Howl — AuraHowls" },
      { name: "description", content: "View this Howl on AuraHowls-Hub." },
      { property: "og:title", content: "Howl — AuraHowls" },
      { property: "og:url", content: `https://aurahowlshub.com/howl/${params.id}` },
      { property: "og:type", content: "article" },
    ],
  }),
  component: HowlDetailPage,
});

async function fetchHowlById(id: string): Promise<HowlRecord | null> {
  const { data, error } = await supabase
    .from("howls")
    .select(
      `id, author_id, content, view_count, howl_count, echo_count, rehowl_count, edited,
       created_at, updated_at,
       media:howl_media ( id, storage_path, media_type, position )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  const hydrated = await hydrateHowls([data]);
  return hydrated[0] ?? null;
}

function HowlDetailPage() {
  const { id } = Route.useParams();
  const [howl, setHowl] = useState<HowlRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [echoesOpen, setEchoesOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    fetchHowlById(id).then((h) => {
      if (cancelled) return;
      if (!h) setNotFound(true);
      else setHowl(h);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <AppShell rightRail={false}>
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (notFound || deleted) {
    return (
      <AppShell rightRail={false}>
        <div className="mx-auto max-w-xl py-16 text-center space-y-4">
          <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="font-display text-2xl font-bold">Howl not found</h1>
          <p className="text-muted-foreground text-sm">
            This Howl may have been deleted or the link is invalid.
          </p>
          <Button asChild className="rounded-full">
            <Link to="/home">Back to Den</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  if (!howl) return null;

  return (
    <AppShell rightRail={false}>
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-xl font-bold">Howl</h1>
        </div>

        <HowlCard
          howl={howl}
          onChanged={() => fetchHowlById(id).then((h) => h && setHowl(h))}
          onDeleted={() => setDeleted(true)}
        />

        <div className="mt-2">
          <button
            onClick={() => setEchoesOpen(true)}
            className="w-full rounded-2xl border border-border/60 bg-card/40 px-5 py-3 text-left text-sm text-muted-foreground transition hover:border-primary/40 hover:bg-card/60 hover:text-foreground"
          >
            <span className="font-semibold text-foreground">{howl.echo_count}</span>{" "}
            {howl.echo_count === 1 ? "Echo" : "Echoes"} — click to view replies
          </button>
        </div>
      </div>

      <EchoesDialog
        open={echoesOpen}
        onOpenChange={setEchoesOpen}
        howlId={howl.id}
        onChanged={() => fetchHowlById(id).then((h) => h && setHowl(h))}
      />
    </AppShell>
  );
}
