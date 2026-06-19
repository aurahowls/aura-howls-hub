import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PackList } from "@/components/PackList";
import { fetchFollowing, type ProfileSummary } from "@/lib/profiles";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/pack/following")({
  component: PackFollowing,
});

function PackFollowing() {
  const { user } = useCurrentUser();
  const [members, setMembers] = useState<ProfileSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const m = await fetchFollowing(user.id);
      if (cancelled) return;
      setMembers(m);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  if (loading) return <div className="glass-card rounded-3xl p-8 text-center text-sm text-muted-foreground">Tracking the trail…</div>;
  const followingIds = new Set(members.map((m) => m.id));
  return <PackList members={members} emptyText="You're not following anyone yet — check Suggested." followingIds={followingIds} />;
}