import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { toggleBookmark, fetchBookmarkIds } from "@/lib/bookmarks";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";

export function BookmarkButton({ howlId, className }: { howlId: string; className?: string }) {
  const { user } = useCurrentUser();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    void fetchBookmarkIds(user.id).then((s) => setSaved(s.has(howlId)));
  }, [user?.id, howlId]);

  const onClick = async () => {
    const next = !saved;
    setSaved(next);
    try {
      await toggleBookmark(howlId, saved);
      toast.success(next ? "Saved to bookmarks" : "Removed from bookmarks");
    } catch (e: any) {
      setSaved(!next);
      toast.error(e?.message ?? "Failed");
    }
  };

  return (
    <button
      onClick={onClick}
      aria-label={saved ? "Remove bookmark" : "Bookmark"}
      className={cn(
        "flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-primary/10 hover:text-primary",
        saved && "text-primary",
        className,
      )}
    >
      <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
    </button>
  );
}