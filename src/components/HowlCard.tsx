import { useState } from "react";
import { MessageCircle, Repeat2, Share2, MoreHorizontal, Pencil, Trash2, Eye, Loader2, Flag, UserX, VolumeX, Megaphone, Lock } from "lucide-react";
import {
  deleteHowl,
  editHowl,
  formatCount,
  formatRelative,
  toggleLike,
  toggleRehowl,
  type HowlRecord,
} from "@/lib/howls";
import { HowlMedia } from "./HowlMedia";
import { EchoesDialog } from "./EchoesDialog";
import { BookmarkButton } from "./BookmarkButton";
import { PollBlock } from "./PollBlock";
import { MaybeVerified } from "./VerifiedBadge";
import { ReportDialog } from "./ReportDialog";
import { blockUser, muteUser } from "@/lib/moderation";
import { LinkifiedText } from "@/lib/text";
import { Link } from "@tanstack/react-router";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TipButton } from "./TipButton";
import { PromoteHowlDialog } from "./PromoteHowlDialog";

function PawIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <ellipse cx="6" cy="11" rx="2" ry="2.6" />
      <ellipse cx="18" cy="11" rx="2" ry="2.6" />
      <ellipse cx="9.5" cy="6.5" rx="1.8" ry="2.4" />
      <ellipse cx="14.5" cy="6.5" rx="1.8" ry="2.4" />
      <path d="M12 12c-3.5 0-6 2.6-6 5.2 0 2.1 1.7 3.3 3.6 3.3 1.1 0 1.6-.5 2.4-.5s1.3.5 2.4.5c1.9 0 3.6-1.2 3.6-3.3 0-2.6-2.5-5.2-6-5.2z" />
    </svg>
  );
}

export function HowlCard({
  howl,
  onChanged,
  onDeleted,
}: {
  howl: HowlRecord;
  onChanged?: () => void;
  onDeleted?: () => void;
}) {
  const { user } = useCurrentUser();
  const isMine = user?.id === howl.author_id;

  const [liked, setLiked] = useState(howl.liked);
  const [likeCount, setLikeCount] = useState(howl.howl_count);
  const [rehowled, setRehowled] = useState(howl.rehowled);
  const [rehowlCount, setRehowlCount] = useState(howl.rehowl_count);
  const [echoCount, setEchoCount] = useState(howl.echo_count);
  const [echoesOpen, setEchoesOpen] = useState(false);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(howl.content ?? "");
  const [savingEdit, setSavingEdit] = useState(false);
  const [content, setContent] = useState(howl.content ?? "");
  const [edited, setEdited] = useState(howl.edited);
  const [reportOpen, setReportOpen] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);

  const isPromoted = (howl as any).is_promoted ?? false;
  const isSubscriberOnly = (howl as any).is_subscriber_only ?? false;

  const handle = howl.author?.username ?? "wolf";
  const displayName = howl.author?.display_name ?? handle;
  const verified = howl.author?.is_verified ?? false;
  const avatar =
    howl.author?.avatar_url ??
    `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(handle)}`;

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
    try {
      await toggleRehowl(howl.id, rehowled);
    } catch (e: any) {
      setRehowled(!next);
      setRehowlCount((c) => c + (next ? -1 : 1));
      toast.error(e?.message ?? "Failed");
    }
  };

  const onShare = async () => {
    const url = `${window.location.origin}/howl/${howl.id}`;
    try {
      if (navigator.share) await navigator.share({ title: "Howl", text: content, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      // user cancelled
    }
  };

  const onDelete = async () => {
    if (!confirm("Delete this Howl?")) return;
    try {
      await deleteHowl(howl.id);
      toast.success("Howl deleted");
      onDeleted?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete");
    }
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    try {
      await editHowl(howl.id, draft);
      setContent(draft.trim());
      setEdited(true);
      setEditing(false);
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to edit");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <article className="glass-card group rounded-3xl p-5 transition-all hover:border-primary/40 hover:shadow-[0_0_40px_-12px_oklch(0.78_0.16_70/0.35)]">
      {/* Sponsored label */}
      {isPromoted && (
        <div className="mb-2 flex items-center gap-1.5">
          <Megaphone className="h-3 w-3 text-muted-foreground/60" />
          <span className="text-[10px] uppercase tracking-widest font-medium text-muted-foreground/60">Sponsored</span>
        </div>
      )}
      {/* Subscriber-only badge */}
      {isSubscriberOnly && (
        <Badge variant="outline" className="mb-2 gap-1 border-purple-500/30 text-purple-400 text-[10px]">
          <Lock className="h-2.5 w-2.5" /> Subscribers only
        </Badge>
      )}
      <div className="flex gap-3">
        <Link to="/u/$username" params={{ username: handle }} className="shrink-0">
          <img src={avatar} alt="" className="h-11 w-11 rounded-full ring-1 ring-border" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <Link
                to="/u/$username"
                params={{ username: handle }}
                className="inline-flex items-center gap-1 truncate font-semibold hover:underline"
              >
                {displayName}
                <MaybeVerified verified={verified} size={14} />
              </Link>
              <span className="truncate text-sm text-muted-foreground">
                @{handle} · {formatRelative(howl.created_at)}
                {edited && <span className="ml-1 italic">(edited)</span>}
              </span>
            </div>
            {!editing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="More"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="border-border bg-card">
                  {isMine ? (
                    <>
                      <DropdownMenuItem onSelect={() => { setDraft(content); setEditing(true); }}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setPromoteOpen(true)}>
                        <Megaphone className="mr-2 h-4 w-4" /> Promote Howl
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem onSelect={() => setReportOpen(true)}>
                        <Flag className="mr-2 h-4 w-4" /> Report Howl
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={async () => {
                          try { await muteUser(howl.author_id); toast.success("Muted"); } catch (e: any) { toast.error(e?.message ?? "Failed"); }
                        }}
                      >
                        <VolumeX className="mr-2 h-4 w-4" /> Mute @{handle}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={async () => {
                          if (!confirm(`Block @${handle}? You won't see their Howls or DMs.`)) return;
                          try { await blockUser(howl.author_id); toast.success("Blocked"); onDeleted?.(); } catch (e: any) { toast.error(e?.message ?? "Failed"); }
                        }}
                      >
                        <UserX className="mr-2 h-4 w-4" /> Block @{handle}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {editing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={500}
                className="min-h-[80px] w-full resize-none rounded-xl border border-border bg-background/60 p-3 text-sm outline-none focus:border-primary/50"
              />
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={savingEdit}>
                  Cancel
                </Button>
                <Button size="sm" onClick={saveEdit} disabled={savingEdit} className="btn-gold rounded-full px-4">
                  {savingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            content && (
              <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/95">
                <LinkifiedText text={content} />
              </p>
            )
          )}

          <HowlMedia media={howl.media} howlId={howl.id} viewCount={howl.view_count} />

          <PollBlock howlId={howl.id} />

          <div className="mt-4 flex max-w-md items-center justify-between text-muted-foreground">
            <button
              onClick={() => setEchoesOpen(true)}
              className="flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-secondary/15 hover:text-secondary"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">{formatCount(echoCount)}</span>
            </button>
            <button
              onClick={onRehowl}
              className={cn(
                "flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-emerald-500/10 hover:text-emerald-400",
                rehowled && "text-emerald-400",
              )}
            >
              <Repeat2 className="h-4 w-4" />
              <span className="text-xs">{formatCount(rehowlCount)}</span>
            </button>
            <button
              onClick={onLike}
              className={cn(
                "flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-primary/10 hover:text-primary",
                liked && "text-primary",
              )}
            >
              <PawIcon className={cn("h-4 w-4 transition-transform", liked && "scale-110")} />
              <span className="text-xs">{formatCount(likeCount)}</span>
            </button>
            <span className="flex items-center gap-1 text-xs"><Eye className="h-4 w-4" /> {formatCount(howl.view_count)}</span>
            <button
              onClick={onShare}
              className="flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-muted hover:text-foreground"
              aria-label="Share"
            >
              <Share2 className="h-4 w-4" />
            </button>
            {!isMine && (
              <TipButton
                recipientId={howl.author_id}
                recipientName={handle}
                howlId={howl.id}
              />
            )}
            <BookmarkButton howlId={howl.id} />
          </div>
        </div>
      </div>

      <EchoesDialog
        open={echoesOpen}
        onOpenChange={setEchoesOpen}
        howlId={howl.id}
        onChanged={() => setEchoCount((c) => c)}
      />
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        target_type="howl"
        target_id={howl.id}
      />
      <PromoteHowlDialog
        howlId={howl.id}
        open={promoteOpen}
        onOpenChange={setPromoteOpen}
      />
    </article>
  );
}

export function HowlSkeleton() {
  return (
    <div className="glass-card rounded-3xl p-5">
      <div className="flex gap-3">
        <div className="h-11 w-11 shrink-0 rounded-full skeleton-shimmer" />
        <div className="flex-1 space-y-3">
          <div className="h-3 w-1/3 rounded skeleton-shimmer" />
          <div className="h-3 w-full rounded skeleton-shimmer" />
          <div className="h-3 w-4/5 rounded skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}