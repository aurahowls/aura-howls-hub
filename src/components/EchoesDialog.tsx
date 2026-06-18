import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createEcho,
  deleteEcho,
  fetchEchoes,
  formatRelative,
  type EchoRecord,
} from "@/lib/howls";
import { useCurrentUser } from "@/hooks/use-current-user";

export function EchoesDialog({
  open,
  onOpenChange,
  howlId,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  howlId: string;
  onChanged?: () => void;
}) {
  const { user } = useCurrentUser();
  const [echoes, setEchoes] = useState<EchoRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchEchoes(howlId)
      .then(setEchoes)
      .catch((e) => toast.error(e?.message ?? "Failed to load echoes"))
      .finally(() => setLoading(false));
  }, [open, howlId]);

  const submit = async () => {
    if (!draft.trim()) return;
    setPosting(true);
    try {
      await createEcho(howlId, draft);
      setDraft("");
      const next = await fetchEchoes(howlId);
      setEchoes(next);
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to echo");
    } finally {
      setPosting(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteEcho(id);
      setEchoes((es) => es.filter((e) => e.id !== id));
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Echoes</DialogTitle>
        </DialogHeader>

        <div className="max-h-[40vh] space-y-3 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : echoes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No echoes yet. Be the first to echo back.
            </p>
          ) : (
            echoes.map((e) => {
              const handle = e.author?.username ?? "wolf";
              const avatar =
                e.author?.avatar_url ??
                `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(handle)}`;
              return (
                <div key={e.id} className="flex gap-3 rounded-2xl border border-border/60 bg-background/40 p-3">
                  <img src={avatar} alt="" className="h-8 w-8 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate">
                        <span className="font-semibold">{e.author?.display_name ?? handle}</span>{" "}
                        <span className="text-muted-foreground">@{handle} · {formatRelative(e.created_at)}</span>
                      </span>
                      {user?.id === e.author_id && (
                        <button
                          onClick={() => remove(e.id)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Delete echo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{e.content}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
          <textarea
            value={draft}
            onChange={(ev) => setDraft(ev.target.value)}
            placeholder="Echo back…"
            maxLength={300}
            className="min-h-[64px] w-full resize-none rounded-xl border border-border bg-background/60 p-3 text-sm outline-none focus:border-primary/50"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{draft.length}/300</span>
            <Button onClick={submit} disabled={posting || !draft.trim()} className="btn-gold rounded-full px-5">
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Echo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}