import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Repeat2, Share2, Bookmark as BookmarkIcon, Volume2, VolumeX, UserPlus, UserCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { hydrateHowls, toggleLike, toggleRehowl, incrementView, formatCount, type HowlRecord } from "@/lib/howls";
import { toggleBookmark, fetchBookmarkIds } from "@/lib/bookmarks";
import { toggleFollow } from "@/lib/profiles";
import { useCurrentUser } from "@/hooks/use-current-user";
import { EchoesDialog } from "@/components/EchoesDialog";
import { MaybeVerified } from "@/components/VerifiedBadge";
import { LinkifiedText } from "@/lib/text";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/reels")({
  component: ReelsPage,
});

async function fetchVideoFeed(limit = 30): Promise<HowlRecord[]> {
  const { data: media } = await supabase
    .from("howl_media")
    .select(
      `howl_id, howls!inner ( id, created_at )`,
    )
    .eq("media_type", "video")
    .order("created_at", { foreignTable: "howls", ascending: false })
    .limit(limit);
  const ids = Array.from(new Set((media ?? []).map((m: any) => m.howl_id)));
  if (!ids.length) return [];
  const { data: rows } = await supabase
    .from("howls")
    .select(
      `id, author_id, content, view_count, howl_count, echo_count, rehowl_count, edited, created_at, updated_at,
       media:howl_media ( id, storage_path, media_type, position )`,
    )
    .in("id", ids)
    .order("created_at", { ascending: false });
  return hydrateHowls(rows ?? []);
}

function ReelsPage() {
  const [items, setItems] = useState<HowlRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    void fetchVideoFeed().then((r) => {
      setItems(r);
      setLoading(false);
    });
  }, []);

  return (
    <AppShell rightRail={false}>
      <h1 className="sr-only">Wolf Reels</h1>
      <div className="-mt-4 lg:-mt-6">
        <div
          className="mx-auto h-[calc(100dvh-90px)] max-w-md snap-y snap-mandatory overflow-y-auto rounded-3xl bg-black/40"
          style={{ scrollbarWidth: "none" }}
        >
          {loading ? (
            <div className="grid h-full place-items-center text-muted-foreground">Loading reels…</div>
          ) : items.length === 0 ? (
            <div className="grid h-full place-items-center px-6 text-center text-muted-foreground">
              <div>
                <p className="font-display text-lg text-foreground">No reels yet</p>
                <p className="mt-1 text-sm">Be the first wolf to drop a video Howl.</p>
              </div>
            </div>
          ) : (
            items.map((h) => (
              <ReelItem key={h.id} howl={h} muted={muted} onToggleMute={() => setMuted((m) => !m)} />
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}

function ReelItem({
  howl,
  muted,
  onToggleMute,
}: {
  howl: HowlRecord;
  muted: boolean;
  onToggleMute: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const countedRef = useRef(false);
  const { user } = useCurrentUser();
  const [liked, setLiked] = useState(howl.liked);
  const [likeCount, setLikeCount] = useState(howl.howl_count);
  const [rehowled, setRehowled] = useState(howl.rehowled);
  const [rehowlCount, setRehowlCount] = useState(howl.rehowl_count);
  const [echoesOpen, setEchoesOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);

  const video = howl.media.find((m) => m.media_type === "video");
  const handle = howl.author?.username ?? "wolf";
  const isMe = user?.id === howl.author_id;

  useEffect(() => {
    if (!user?.id) return;
    void fetchBookmarkIds(user.id).then((s) => setSaved(s.has(howl.id)));
  }, [user?.id, howl.id]);

  useEffect(() => {
    if (!user?.id || !howl.author_id || isMe) return;
    void supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("following_id", howl.author_id)
      .maybeSingle()
      .then(({ data }) => setFollowing(!!data));
  }, [user?.id, howl.author_id, isMe]);

  useEffect(() => {
    const v = videoRef.current;
    const c = containerRef.current;
    if (!v || !c) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.intersectionRatio >= 0.6) {
          v.play().catch(() => {});
          if (!countedRef.current) {
            countedRef.current = true;
            incrementView(howl.id).catch(() => {});
          }
        } else v.pause();
      },
      { threshold: [0, 0.6, 1] },
    );
    io.observe(c);
    return () => io.disconnect();
  }, [howl.id]);

  const onLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      await toggleLike(howl.id, liked);
    } catch (e: any) {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
      toast.error(e?.message ?? "Failed");
    }
  };

  const onRehowl = async () => {
    const next = !rehowled;
    setRehowled(next);
    setRehowlCount((c) => c + (next ? 1 : -1));
    try { await toggleRehowl(howl.id, rehowled); }
    catch (e: any) {
      setRehowled(!next);
      setRehowlCount((c) => c + (next ? -1 : 1));
      toast.error(e?.message ?? "Failed");
    }
  };

  const onBookmark = async () => {
    const next = !saved;
    setSaved(next);
    try { await toggleBookmark(howl.id, saved); }
    catch { setSaved(!next); }
  };

  const onFollow = async () => {
    if (!howl.author_id || isMe) return;
    const next = !following;
    setFollowing(next);
    try { await toggleFollow(howl.author_id, following); }
    catch { setFollowing(!next); }
  };

  const onShare = async () => {
    const url = `${window.location.origin}/howl/${howl.id}`;
    try {
      if (navigator.share) await navigator.share({ url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch {}
  };

  if (!video) return null;

  return (
    <div ref={containerRef} className="relative h-full w-full snap-start">
      <video
        ref={videoRef}
        src={video.url}
        muted={muted}
        loop
        playsInline
        onClick={onToggleMute}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

      <button
        onClick={onToggleMute}
        className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>

      {/* Right rail actions */}
      <div className="absolute right-2 bottom-24 flex flex-col items-center gap-4 text-white">
        <ReelAction icon={<Heart className={cn("h-6 w-6", liked && "fill-red-500 text-red-500")} />} count={likeCount} onClick={onLike} label="Howl" />
        <ReelAction icon={<MessageCircle className="h-6 w-6" />} count={howl.echo_count} onClick={() => setEchoesOpen(true)} label="Echo" />
        <ReelAction icon={<Repeat2 className={cn("h-6 w-6", rehowled && "text-emerald-400")} />} count={rehowlCount} onClick={onRehowl} label="Rehowl" />
        <ReelAction icon={<BookmarkIcon className={cn("h-6 w-6", saved && "fill-current text-primary")} />} onClick={onBookmark} label="Save" />
        <ReelAction icon={<Share2 className="h-6 w-6" />} onClick={onShare} label="Share" />
      </div>

      {/* Bottom info */}
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <div className="flex items-center gap-2">
          <Link to="/u/$username" params={{ username: handle }} className="flex items-center gap-2">
            <img
              src={howl.author?.avatar_url ?? `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(handle)}`}
              alt=""
              className="h-9 w-9 rounded-full ring-2 ring-white/70 object-cover"
            />
            <span className="flex items-center gap-1 font-semibold">
              @{handle}
              <MaybeVerified verified={howl.author?.is_verified} size={13} />
            </span>
          </Link>
          {!isMe && howl.author_id && (
            <button
              onClick={onFollow}
              className={cn(
                "ml-2 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium",
                following ? "border-white/60 bg-white/10" : "border-primary bg-primary text-primary-foreground",
              )}
            >
              {following ? <UserCheck className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
              {following ? "Following" : "Follow"}
            </button>
          )}
        </div>
        {howl.content && (
          <p className="mt-2 line-clamp-3 text-sm">
            <LinkifiedText text={howl.content} />
          </p>
        )}
        <p className="mt-1 text-xs text-white/70">{formatCount(howl.view_count)} views</p>
      </div>

      <EchoesDialog open={echoesOpen} onOpenChange={setEchoesOpen} howlId={howl.id} />
    </div>
  );
}

function ReelAction({ icon, count, onClick, label }: { icon: React.ReactNode; count?: number; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} aria-label={label} className="flex flex-col items-center gap-1">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-black/40 backdrop-blur">{icon}</span>
      {typeof count === "number" && <span className="text-xs">{formatCount(count)}</span>}
    </button>
  );
}