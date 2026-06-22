import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";
import { fetchActiveAnnouncements } from "@/lib/moderation";

const DISMISS_KEY = "aurahowls:dismissed-announcements";

export function AnnouncementBanner() {
  const [items, setItems] = useState<any[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]")); }
    catch { return new Set(); }
  });

  useEffect(() => {
    fetchActiveAnnouncements().then(setItems).catch(() => {});
  }, []);

  const visible = items.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify([...next])); } catch {}
  };

  return (
    <div className="mb-4 space-y-2">
      {visible.map((a) => (
        <div key={a.id} className="glass-card flex items-start gap-3 rounded-2xl border-primary/40 p-4">
          <Megaphone className="mt-1 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{a.title}</p>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
          </div>
          <button onClick={() => dismiss(a.id)} className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}