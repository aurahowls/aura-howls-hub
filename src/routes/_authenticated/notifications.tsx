import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { notifications } from "@/lib/mock-data";
import { Repeat2, MessageCircle, UserPlus, AtSign } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

const iconFor: Record<string, { Icon: LucideIcon; color: string }> = {
  howl: { Icon: AtSign, color: "text-primary" },
  echo: { Icon: MessageCircle, color: "text-secondary" },
  follow: { Icon: UserPlus, color: "text-emerald-400" },
  rehowl: { Icon: Repeat2, color: "text-emerald-400" },
  mention: { Icon: AtSign, color: "text-secondary" },
};

function NotificationsPage() {
  return (
    <AppShell>
      <h1 className="mb-4 font-display text-3xl font-bold">Wolf Alerts</h1>
      <div className="space-y-2">
        {notifications.map((n) => {
          const { Icon, color } = iconFor[n.type] ?? iconFor.howl;
          return (
            <div
              key={n.id}
              className="glass-card flex items-start gap-3 rounded-2xl p-4 transition hover:border-primary/40"
            >
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card/80 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <img src={n.wolf.avatar} alt="" className="h-10 w-10 shrink-0 rounded-full ring-1 ring-border" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-semibold">{n.wolf.name}</span>{" "}
                  <span className="text-muted-foreground">{n.text}</span>
                </p>
                <p className="text-xs text-muted-foreground">{n.time} ago</p>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}