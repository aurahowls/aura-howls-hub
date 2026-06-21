import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { HowlCard, HowlSkeleton } from "@/components/HowlCard";
import { Bookmark } from "lucide-react";
import { fetchBookmarkedHowls } from "@/lib/bookmarks";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { HowlRecord } from "@/lib/howls";

export const Route = createFileRoute("/_authenticated/bookmarks")({
  component: BookmarksPage,
});

function BookmarksPage() {
  const { user } = useCurrentUser();
  const [items, setItems] = useState<HowlRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      setItems(await fetchBookmarkedHowls(user.id));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <AppShell>
      <header className="mb-6 flex items-center gap-3">
        <Bookmark className="h-7 w-7 text-primary" />
        <div>
          <h1 className="font-display text-3xl font-bold">Bookmarks</h1>
          <p className="text-sm text-muted-foreground">
            {items.length.toLocaleString()} saved Howl{items.length === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <HowlSkeleton key={i} />)
        ) : items.length === 0 ? (
          <div className="glass-card rounded-3xl p-10 text-center text-muted-foreground">
            <p className="font-display text-lg text-foreground">No bookmarks yet</p>
            <p className="mt-1 text-sm">Tap the bookmark icon on any Howl to save it here.</p>
          </div>
        ) : (
          items.map((h) => <HowlCard key={h.id} howl={h} onDeleted={load} onChanged={load} />)
        )}
      </div>
    </AppShell>
  );
}