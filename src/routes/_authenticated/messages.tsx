import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { conversations } from "@/lib/mock-data";
import { useState } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/messages")({
  component: MessagesPage,
});

const fakeThread = [
  { from: "them", text: "Heading to the ridge tonight?" },
  { from: "me", text: "On my way. Bring the rest of the pack." },
  { from: "them", text: "Meeting at the clearing tonight?" },
];

function MessagesPage() {
  const { profile } = useCurrentUser();
  const [active, setActive] = useState(conversations[0].id);
  const activeConvo = conversations.find((c) => c.id === active) ?? conversations[0];

  const myAvatar =
    profile?.avatar_url ??
    `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(profile?.username ?? "wolf")}`;

  return (
    <AppShell rightRail={false}>
      <h1 className="mb-4 font-display text-3xl font-bold">Pack DMs</h1>
      <div className="glass-card grid h-[70vh] overflow-hidden rounded-3xl md:grid-cols-[280px_1fr]">
        <div className="border-b border-border md:border-b-0 md:border-r">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className={cn(
                "flex w-full items-center gap-3 p-4 text-left transition hover:bg-muted/40",
                active === c.id && "bg-muted/60",
              )}
            >
              <img src={c.wolf.avatar} alt="" className="h-10 w-10 shrink-0 rounded-full ring-1 ring-border" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{c.wolf.name}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{c.time}</span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{c.lastMessage}</p>
              </div>
              {c.unread > 0 && (
                <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {c.unread}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-3 border-b border-border p-4">
            <img src={activeConvo.wolf.avatar} alt="" className="h-10 w-10 rounded-full ring-1 ring-border" />
            <div>
              <p className="font-semibold">{activeConvo.wolf.name}</p>
              <p className="text-xs text-muted-foreground">@{activeConvo.wolf.handle}</p>
            </div>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {fakeThread.map((m, i) => (
              <div key={i} className={cn("flex", m.from === "me" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                    m.from === "me" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <form className="flex items-center gap-2 border-t border-border p-3" onSubmit={(e) => e.preventDefault()}>
            <img src={myAvatar} alt="" className="h-8 w-8 rounded-full" />
            <input
              maxLength={1000}
              placeholder="Send a howl…"
              className="flex-1 rounded-full border border-border bg-card/60 px-4 py-2 text-sm outline-none focus:border-primary"
            />
            <button className="btn-gold grid h-10 w-10 place-items-center rounded-full">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}