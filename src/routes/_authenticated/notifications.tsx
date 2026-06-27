import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { fetchAlerts, markAlertRead, markAllAlertsRead, type AlertRecord } from "@/lib/notifications";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Repeat2, MessageCircle, UserPlus, AtSign, Heart, Mail, CheckCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/howls";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

const meta: Record<string, { Icon: LucideIcon; color: string; verb: string }> = {
  follow: { Icon: UserPlus, color: "text-emerald-400", verb: "joined your Pack" },
  howl_like: { Icon: Heart, color: "text-primary", verb: "🐺 howled at your Howl" },
  echo: { Icon: MessageCircle, color: "text-secondary", verb: "echoed your Howl" },
  rehowl: { Icon: Repeat2, color: "text-emerald-400", verb: "rehowled your Howl" },
  mention: { Icon: AtSign, color: "text-secondary", verb: "mentioned you in a Howl" },
  dm: { Icon: Mail, color: "text-primary", verb: "sent you a Pack DM" },
};

/** Map notification types to their best destination URL */
function resolveNotificationLink(n: AlertRecord): string {
  if (n.type === "dm") return "/messages";
  if (n.type === "follow") {
    const actor = n.actor?.username;
    return actor ? `/u/${actor}` : "/pack";
  }
  // howl_like, echo, rehowl, mention — deep-link to howl detail page when howl_id present
  if (n.howl_id) return `/howl/${n.howl_id}`;
  return "/home";
}

function NotificationsPage() {
  const { user } = useCurrentUser();
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchAlerts().then((d) => {
      if (!cancelled) {
        setAlerts(d);
        setLoading(false);
      }
    });
    const channel = supabase
      .channel(`alerts-page-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => fetchAlerts().then((d) => !cancelled && setAlerts(d)),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  async function handleMarkAll() {
    if (!user) return;
    await markAllAlertsRead(user.id);
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  }

  async function handleClick(a: AlertRecord) {
    if (!a.read) {
      await markAlertRead(a.id);
      setAlerts((prev) => prev.map((x) => (x.id === a.id ? { ...x, read: true } : x)));
    }
  }

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">
          Wolf Alerts
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex h-6 items-center rounded-full bg-primary px-2 text-sm font-bold text-primary-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMarkAll}
          className="gap-2"
          disabled={alerts.every((a) => a.read)}
          aria-label="Mark all notifications as read"
        >
          <CheckCheck className="h-4 w-4" aria-hidden /> Mark all read
        </Button>
      </div>

      {loading && (
        <div role="status" aria-live="polite" className="text-sm text-muted-foreground">
          Listening for howls in the distance…
        </div>
      )}
      {!loading && alerts.length === 0 && (
        <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground" role="status">
          The forest is quiet. No alerts yet.
        </div>
      )}

      <ol className="space-y-2" aria-label="Notifications list">
        {alerts.map((n) => {
          const m = meta[n.type] ?? meta.howl_like;
          const Icon = m.Icon;
          const name = n.actor?.display_name ?? n.actor?.username ?? "A wolf";
          const handle = n.actor?.username ?? "wolf";
          const avatar =
            n.actor?.avatar_url ??
            `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(handle)}`;
          const to = resolveNotificationLink(n);
          return (
            <li key={n.id}>
              <Link
                to={to}
                onClick={() => handleClick(n)}
                className={cn(
                  "glass-card flex items-start gap-3 rounded-2xl p-4 transition hover:border-primary/40",
                  !n.read && "border-primary/50 bg-primary/5",
                )}
                aria-label={`${name} ${m.verb}${n.preview ? `: ${n.preview}` : ""}`}
              >
                <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card/80", m.color)} aria-hidden>
                  <Icon className="h-5 w-5" />
                </div>
                <img
                  src={avatar}
                  alt={`${name}'s avatar`}
                  className="h-10 w-10 shrink-0 rounded-full ring-1 ring-border object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-semibold">{name}</span>{" "}
                    <span className="text-muted-foreground">{m.verb}</span>
                  </p>
                  {n.preview && <p className="mt-1 truncate text-xs text-muted-foreground">"{n.preview}"</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    <time dateTime={n.created_at}>{formatRelative(n.created_at)} ago</time>
                  </p>
                </div>
                {!n.read && (
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary animate-howl-pulse" aria-label="Unread" />
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </AppShell>
  );
}
