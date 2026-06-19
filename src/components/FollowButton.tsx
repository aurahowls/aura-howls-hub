import { useEffect, useState } from "react";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isFollowing as isFollowingFn, toggleFollow } from "@/lib/profiles";
import { useCurrentUser } from "@/hooks/use-current-user";
import { invalidateForYouPool } from "@/lib/feed";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function FollowButton({
  targetId,
  initialFollowing,
  size = "sm",
  onChange,
  className,
}: {
  targetId: string;
  initialFollowing?: boolean;
  size?: "sm" | "default";
  onChange?: (following: boolean) => void;
  className?: string;
}) {
  const { user } = useCurrentUser();
  const [following, setFollowing] = useState<boolean>(!!initialFollowing);
  const [hover, setHover] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(initialFollowing !== undefined);

  useEffect(() => {
    if (initialFollowing !== undefined || !user?.id || user.id === targetId) return;
    let cancelled = false;
    void isFollowingFn(targetId).then((v) => {
      if (!cancelled) {
        setFollowing(v);
        setReady(true);
      }
    });
    return () => { cancelled = true; };
  }, [targetId, user?.id, initialFollowing]);

  if (!user || user.id === targetId) return null;

  async function handle() {
    setBusy(true);
    const prev = following;
    setFollowing(!prev);
    try {
      await toggleFollow(targetId, prev);
      invalidateForYouPool();
      onChange?.(!prev);
    } catch (e: any) {
      setFollowing(prev);
      toast.error(e?.message ?? "Could not update pack");
    } finally {
      setBusy(false);
    }
  }

  const label = !ready ? "" : following ? (hover ? "Unfollow" : "Following") : "Follow";
  const Icon = following ? UserCheck : UserPlus;

  return (
    <Button
      size={size}
      type="button"
      onClick={handle}
      disabled={busy || !ready}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      variant={following ? "outline" : "default"}
      className={cn(
        "rounded-full transition-all",
        following
          ? hover
            ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15"
            : "border-border bg-card/60"
          : "btn-gold",
        className,
      )}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </Button>
  );
}