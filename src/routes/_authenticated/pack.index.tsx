import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PackList } from "@/components/PackList";
import { fetchFollowers, fetchFollowingIds, type ProfileSummary } from "@/lib/profiles";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/pack/")({
  component: PackFollowers,
});

function PackFollowers() {
  const { user } = useCurrentUser();
  const [members, setMembers] = useState<ProfileSummary[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const [m, ids] = await Promise.all([
        fetchFollowers(user.id),
        fetchFollowingIds(user.id),
      ]);
      if (cancelled) return;
      setMembers(m);
      setFollowingIds(new Set(ids));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  if (loading) return <div className="glass-card rounded-3xl p-8 text-center text-sm text-muted-foreground">Loading the pack…</div>;
  return <PackList members={members} emptyText="No pack members yet. Howl louder! 🌙" followingIds={followingIds} />;
}