import { Link } from "@tanstack/react-router";
import { FollowButton } from "./FollowButton";
import type { ProfileSummary } from "@/lib/profiles";

export function PackList({
  members,
  emptyText,
  followingIds,
}: {
  members: ProfileSummary[];
  emptyText: string;
  followingIds?: Set<string>;
}) {
  if (members.length === 0) {
    return (
      <div className="glass-card rounded-3xl p-8 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }
  return (
    <ul className="glass-card divide-y divide-border/60 overflow-hidden rounded-3xl">
      {members.map((p) => (
        <li key={p.id} className="flex items-center gap-3 p-4 transition hover:bg-muted/30">
          <img
            src={p.avatar_url ?? `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(p.username)}`}
            alt=""
            className="h-12 w-12 rounded-full object-cover ring-1 ring-primary/30"
          />
          <Link to="/profile" className="min-w-0 flex-1 group">
            <p className="truncate font-semibold group-hover:text-primary">{p.display_name ?? p.username}</p>
            <p className="truncate text-xs text-muted-foreground">
              @{p.username} · {p.followers_count} pack
            </p>
            {p.bio && <p className="mt-1 truncate text-sm text-muted-foreground">{p.bio}</p>}
          </Link>
          <FollowButton
            targetId={p.id}
            initialFollowing={followingIds ? followingIds.has(p.id) : undefined}
          />
        </li>
      ))}
    </ul>
  );
}