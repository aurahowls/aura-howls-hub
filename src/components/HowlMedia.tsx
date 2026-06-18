import type { HowlMediaItem } from "@/lib/howls";
import { VideoPlayer } from "./VideoPlayer";
import { cn } from "@/lib/utils";

export function HowlMedia({
  media,
  howlId,
  viewCount,
}: {
  media: HowlMediaItem[];
  howlId: string;
  viewCount: number;
}) {
  if (!media.length) return null;
  const video = media.find((m) => m.media_type === "video");
  if (video) {
    return <VideoPlayer src={video.url} howlId={howlId} initialViews={viewCount} className="mt-3" />;
  }
  const images = media.filter((m) => m.media_type === "image");
  const n = images.length;
  return (
    <div
      className={cn(
        "mt-3 grid overflow-hidden rounded-2xl border border-border gap-0.5",
        n === 1 && "grid-cols-1",
        n === 2 && "grid-cols-2",
        n === 3 && "grid-cols-2 grid-rows-2",
        n >= 4 && "grid-cols-2 grid-rows-2",
      )}
    >
      {images.slice(0, 4).map((img, i) => (
        <a
          key={img.id}
          href={img.url}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "relative block bg-black/40",
            n === 3 && i === 0 && "row-span-2",
          )}
        >
          <img
            src={img.url}
            alt=""
            loading="lazy"
            className="h-full max-h-[480px] w-full object-cover"
          />
          {i === 3 && images.length > 4 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-2xl font-bold text-white">
              +{images.length - 4}
            </div>
          )}
        </a>
      ))}
    </div>
  );
}