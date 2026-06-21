import { useEffect, useState } from "react";
import { fetchPollForHowl, isPollExpired, vote, type PollRecord } from "@/lib/polls";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export function PollBlock({ howlId }: { howlId: string }) {
  const [poll, setPoll] = useState<PollRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  const reload = async () => {
    const p = await fetchPollForHowl(howlId);
    setPoll(p);
  };

  useEffect(() => {
    setLoading(true);
    reload().finally(() => setLoading(false));
    // realtime: refresh on any vote change
    const ch = supabase
      .channel(`poll-${howlId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "poll_options" },
        () => void reload(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [howlId]);

  if (loading) return null;
  if (!poll) return null;

  const expired = isPollExpired(poll);
  const showResults = !!poll.my_vote || expired;
  const total = Math.max(1, poll.total_votes);

  const onVote = async (optionId: string) => {
    if (poll.my_vote || expired || voting) return;
    setVoting(true);
    try {
      await vote(poll.id, optionId);
      await reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to vote");
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="mt-3 space-y-2 rounded-2xl border border-border/60 bg-card/30 p-3">
      {poll.options.map((o) => {
        const pct = Math.round((o.vote_count / total) * 100);
        const mine = poll.my_vote === o.id;
        return (
          <button
            key={o.id}
            onClick={() => onVote(o.id)}
            disabled={!!poll.my_vote || expired || voting}
            className={cn(
              "relative w-full overflow-hidden rounded-xl border border-border bg-background/40 px-3 py-2 text-left text-sm transition",
              !poll.my_vote && !expired && "hover:border-primary/60",
              mine && "border-primary",
            )}
          >
            {showResults && (
              <div
                className="absolute inset-y-0 left-0 -z-0 bg-primary/15"
                style={{ width: `${pct}%` }}
              />
            )}
            <div className="relative z-10 flex items-center justify-between gap-3">
              <span className={cn("truncate", mine && "font-semibold text-primary")}>{o.text}</span>
              {showResults && (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {pct}% · {o.vote_count}
                </span>
              )}
            </div>
          </button>
        );
      })}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{poll.total_votes.toLocaleString()} vote{poll.total_votes === 1 ? "" : "s"}</span>
        {poll.expires_at && (
          <span>{expired ? "Final results" : `Ends ${new Date(poll.expires_at).toLocaleString()}`}</span>
        )}
      </div>
    </div>
  );
}