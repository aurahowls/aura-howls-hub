import { useRef, useState } from "react";
import { Image as ImageIcon, Film, X, Sparkles, Loader2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  createHowl,
  detectMediaType,
  MAX_VIDEO_BYTES,
  type UploadProgress,
} from "@/lib/howls";
import { useCurrentUser } from "@/hooks/use-current-user";
import { createPollForHowl } from "@/lib/polls";
import { supabase } from "@/integrations/supabase/client";

const MAX_IMAGES = 4;

export function HowlComposer({ onPosted }: { onPosted?: () => void }) {
  const { profile } = useCurrentUser();
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ url: string; type: "image" | "video" }[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [pollOn, setPollOn] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollDurationH, setPollDurationH] = useState<number>(24);
  const imgInput = useRef<HTMLInputElement>(null);
  const vidInput = useRef<HTMLInputElement>(null);

  const handle = profile?.username ?? "wolf";
  const avatarUrl =
    profile?.avatar_url ??
    `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(handle)}`;

  const reset = () => {
    previews.forEach((p) => URL.revokeObjectURL(p.url));
    setContent("");
    setFiles([]);
    setPreviews([]);
    setProgress(null);
    setPollOn(false);
    setPollOptions(["", ""]);
  };

  const onPickImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!list.length) return;
    if (files.some((f) => detectMediaType(f) === "video")) {
      toast.error("Remove the video before adding images");
      return;
    }
    const remaining = MAX_IMAGES - files.length;
    const next = list.slice(0, remaining).filter((f) => detectMediaType(f) === "image");
    if (!next.length) return;
    setFiles((cur) => [...cur, ...next]);
    setPreviews((cur) => [
      ...cur,
      ...next.map((f) => ({ url: URL.createObjectURL(f), type: "image" as const })),
    ]);
  };

  const onPickVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (detectMediaType(f) !== "video") {
      toast.error("Pick an MP4, MOV, or WebM video");
      return;
    }
    if (f.size > MAX_VIDEO_BYTES) {
      toast.error("Video must be 100 MB or smaller");
      return;
    }
    if (files.length) {
      toast.error("A Howl can have one video or up to 4 images");
      return;
    }
    setFiles([f]);
    setPreviews([{ url: URL.createObjectURL(f), type: "video" }]);
  };

  const removeAt = (i: number) => {
    URL.revokeObjectURL(previews[i].url);
    setFiles((cur) => cur.filter((_, idx) => idx !== i));
    setPreviews((cur) => cur.filter((_, idx) => idx !== i));
  };

  const submit = async () => {
    if (busy) return;
    if (!content.trim() && files.length === 0 && !pollOn) {
      toast.error("Say something or attach media");
      return;
    }
    if (pollOn) {
      const cleaned = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (cleaned.length < 2) {
        toast.error("Poll needs at least 2 options");
        return;
      }
    }
    setBusy(true);
    setProgress(null);
    try {
      const howl = await createHowl({ content, files, onProgress: setProgress });
      if (pollOn) {
        const cleaned = pollOptions.map((o) => o.trim()).filter(Boolean);
        const expires = pollDurationH > 0
          ? new Date(Date.now() + pollDurationH * 3600 * 1000).toISOString()
          : null;
        try {
          await createPollForHowl(howl.id, cleaned, expires);
        } catch (pe: any) {
          await supabase.from("howls").delete().eq("id", howl.id);
          throw pe;
        }
      }
      toast.success("Howl sent 🌕");
      reset();
      onPosted?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to howl");
    } finally {
      setBusy(false);
    }
  };

  const overallPct = progress
    ? Math.round(((progress.fileIndex + progress.percent / 100) / Math.max(files.length, 1)) * 100)
    : 0;

  return (
    <div className="glass-card mb-4 rounded-3xl p-5">
      <div className="flex gap-3">
        <img src={avatarUrl} alt={`${handle}'s avatar`} className="h-11 w-11 rounded-full ring-1 ring-primary/40 object-cover" />
        <div className="min-w-0 flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's howling, wolf?"
            maxLength={500}
            disabled={busy}
            aria-label="Write a Howl"
            enterKeyHint="send"
            className="min-h-[60px] w-full resize-none bg-transparent text-lg outline-none placeholder:text-muted-foreground disabled:opacity-60"
          />

          {previews.length > 0 && (
            <div
              className={
                previews[0].type === "video"
                  ? "mt-2 overflow-hidden rounded-2xl border border-border"
                  : "mt-2 grid grid-cols-2 gap-2"
              }
            >
              {previews.map((p, i) => (
                <div key={i} className="relative overflow-hidden rounded-xl border border-border bg-black/30">
                  {p.type === "image" ? (
                    <img src={p.url} alt="" className="h-40 w-full object-cover" />
                  ) : (
                    <video src={p.url} muted className="max-h-80 w-full object-contain" controls />
                  )}
                  <button
                    type="button"
                    onClick={() => removeAt(i)}
                    disabled={busy}
                    className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white hover:bg-black"
                    aria-label="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {busy && progress && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Uploading {progress.fileIndex + 1} of {files.length}…</span>
                <span>{overallPct}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
            </div>
          )}

          {pollOn && (
            <div className="mt-3 space-y-2 rounded-2xl border border-border bg-card/40 p-3">
              {pollOptions.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={o}
                    onChange={(e) =>
                      setPollOptions((cur) => cur.map((v, idx) => (idx === i ? e.target.value : v)))
                    }
                    maxLength={80}
                    placeholder={`Option ${i + 1}`}
                    aria-label={`Poll option ${i + 1}`}
                    className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-1.5 text-sm outline-none focus:border-primary/50"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setPollOptions((cur) => cur.filter((_, idx) => idx !== i))}
                      className="rounded-full p-1 text-muted-foreground hover:text-destructive"
                      aria-label="Remove option"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <div className="flex items-center justify-between text-xs">
                {pollOptions.length < 4 ? (
                  <button
                    type="button"
                    onClick={() => setPollOptions((cur) => [...cur, ""])}
                    className="text-primary hover:underline"
                  >
                    + Add option
                  </button>
                ) : (
                  <span className="text-muted-foreground">Max 4 options</span>
                )}
                <label htmlFor="poll-duration" className="flex items-center gap-2 text-muted-foreground">
                  Ends in
                  <select
                    id="poll-duration"
                    value={pollDurationH}
                    onChange={(e) => setPollDurationH(Number(e.target.value))}
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                  >
                    <option value={1}>1 hour</option>
                    <option value={24}>1 day</option>
                    <option value={72}>3 days</option>
                    <option value={168}>1 week</option>
                    <option value={0}>No expiry</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => setPollOn(false)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Remove poll
                </button>
              </div>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-1 text-primary">
              <input
                ref={imgInput}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,image/gif"
                hidden
                onChange={onPickImages}
              />
              <input
                ref={vidInput}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,.mov,.mp4,.webm"
                hidden
                onChange={onPickVideo}
              />
              <button
                type="button"
                onClick={() => imgInput.current?.click()}
                disabled={busy}
                className="rounded-full p-2 hover:bg-primary/10 disabled:opacity-40"
                aria-label="Add images"
              >
                <ImageIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => vidInput.current?.click()}
                disabled={busy}
                className="rounded-full p-2 hover:bg-primary/10 disabled:opacity-40"
                aria-label="Add video"
              >
                <Film className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPollOn((v) => !v)}
                disabled={busy}
                className={`rounded-full p-2 hover:bg-primary/10 disabled:opacity-40 ${pollOn ? "bg-primary/15 text-primary" : ""}`}
                aria-label="Add poll"
              >
                <BarChart3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled
                className="rounded-full p-2 opacity-50"
                aria-label="Aura"
              >
                <Sparkles className="h-4 w-4" />
              </button>
              <span className="ml-2 self-center text-xs text-muted-foreground">
                {content.length}/500
              </span>
            </div>
            <Button onClick={submit} disabled={busy} className="btn-gold rounded-full px-6">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Howl"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}