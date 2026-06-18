import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize2, Eye } from "lucide-react";
import { incrementView, formatCount } from "@/lib/howls";
import { cn } from "@/lib/utils";

export function VideoPlayer({
  src,
  howlId,
  initialViews = 0,
  className,
}: {
  src: string;
  howlId: string;
  initialViews?: number;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [views, setViews] = useState(initialViews);
  const countedRef = useRef(false);

  // Autoplay + pause based on viewport visibility
  useEffect(() => {
    const v = videoRef.current;
    const c = containerRef.current;
    if (!v || !c) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.6) {
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    io.observe(c);
    return () => io.disconnect();
  }, []);

  // Count one view after 2s of playback
  useEffect(() => {
    if (!playing || countedRef.current) return;
    const t = setTimeout(() => {
      countedRef.current = true;
      incrementView(howlId)
        .then(() => setViews((v) => v + 1))
        .catch(() => {});
    }, 2000);
    return () => clearTimeout(t);
  }, [playing, howlId]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const pct = Number(e.target.value);
    v.currentTime = (pct / 100) * duration;
    setProgress(pct);
  };

  const goFullscreen = () => {
    const v = videoRef.current as any;
    if (!v) return;
    if (v.requestFullscreen) v.requestFullscreen();
    else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-black",
        className,
      )}
    >
      <video
        ref={videoRef}
        src={src}
        muted={muted}
        playsInline
        loop
        preload="metadata"
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => {
          const t = e.currentTarget;
          if (t.duration) setProgress((t.currentTime / t.duration) * 100);
        }}
        className="block max-h-[560px] w-full cursor-pointer object-contain"
      />

      {/* View badge */}
      <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs text-white backdrop-blur">
        <Eye className="h-3 w-3" /> {formatCount(views)}
      </div>

      {/* Controls */}
      <div className="absolute inset-x-0 bottom-0 translate-y-1 bg-gradient-to-t from-black/85 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
            className="rounded-full p-1.5 text-white hover:bg-white/15"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progress}
            onChange={onSeek}
            aria-label="Seek"
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/20 accent-primary"
            style={{
              background: `linear-gradient(to right, oklch(0.78 0.16 70) ${progress}%, rgba(255,255,255,0.2) ${progress}%)`,
            }}
          />
          <button
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Unmute" : "Mute"}
            className="rounded-full p-1.5 text-white hover:bg-white/15"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            onClick={goFullscreen}
            aria-label="Fullscreen"
            className="rounded-full p-1.5 text-white hover:bg-white/15"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}