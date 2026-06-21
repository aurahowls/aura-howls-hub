import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";
import { fetchTrendingHashtags } from "@/lib/trending";
import type { HashtagSummary } from "@/lib/search";

export function TrendingSidebar() {
  const [tags, setTags] = useState<HashtagSummary[]>([]);
  useEffect(() => {
    void fetchTrendingHashtags(10).then(setTags);
  }, []);
  return (
    <div className="glass-card rounded-3xl p-5">
      <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
        <TrendingUp className="h-4 w-4 text-primary" />
        Trending Howls
      </h3>
      {tags.length === 0 ? (
        <p className="text-xs text-muted-foreground">No trends yet. Be the first wolf to howl with a #hashtag.</p>
      ) : (
        <ul className="space-y-1">
          {tags.map((t, i) => (
            <li key={t.tag}>
              <Link
                to="/hashtag/$tag"
                params={{ tag: t.tag }}
                className="block rounded-xl p-2 transition hover:bg-muted/50"
              >
                <p className="text-xs text-muted-foreground">Trending #{i + 1}</p>
                <p className="font-semibold text-foreground">#{t.tag}</p>
                <p className="text-xs text-muted-foreground">{t.howl_count} Howl{t.howl_count === 1 ? "" : "s"}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        to="/trending"
        className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
      >
        See all trending →
      </Link>
    </div>
  );
}