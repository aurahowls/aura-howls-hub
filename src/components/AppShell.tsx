import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, Bell, Mail, Search, User, Settings, LogOut, Menu, X, Sparkles, TrendingUp, Users } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Logo, LogoWordmark } from "./Logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { trending } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useUnreadCounts } from "@/hooks/use-unread-counts";
import { useQueryClient } from "@tanstack/react-query";

const nav = [
  { to: "/home", label: "Den", icon: Home },
  { to: "/search", label: "Search", icon: Search },
  { to: "/notifications", label: "Wolf Alerts", icon: Bell, badgeKey: "alerts" as const },
  { to: "/messages", label: "Pack DMs", icon: Mail, badgeKey: "dms" as const },
  { to: "/pack", label: "Pack", icon: Users },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children, rightRail = true }: { children: ReactNode; rightRail?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, user } = useCurrentUser();
  const { alerts, dms } = useUnreadCounts();
  const badges: Record<string, number> = { alerts, dms };

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    sessionStorage.removeItem("aurahowls:remember");
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const displayName = profile?.display_name ?? profile?.username ?? "Wolf";
  const handle = profile?.username ?? user?.email?.split("@")[0] ?? "wolf";
  const avatarUrl =
    profile?.avatar_url ??
    `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(handle)}`;

  return (
    <div className="min-h-screen w-full">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/60 bg-background/70 px-4 py-3 backdrop-blur-xl lg:hidden">
        <LogoWordmark size={36} />
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-full p-2 hover:bg-muted"
          aria-label="Toggle navigation"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 lg:px-6">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-x-0 top-[57px] z-30 border-b border-border bg-background/95 px-4 py-4 backdrop-blur-xl transition-all lg:sticky lg:top-0 lg:z-0 lg:block lg:h-screen lg:w-64 lg:shrink-0 lg:border-0 lg:bg-transparent lg:py-6 lg:backdrop-blur-none",
            open ? "block" : "hidden",
          )}
        >
          <div className="hidden lg:mb-8 lg:flex">
            <Link to="/home" className="block">
              <LogoWordmark size={48} />
            </Link>
          </div>

          <nav className="flex flex-col gap-1">
            {nav.map((item) => {
              const active = pathname === item.to;
              const Icon = item.icon;
              const badge = "badgeKey" in item && item.badgeKey ? badges[item.badgeKey] : 0;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "group flex items-center gap-4 rounded-2xl px-4 py-3 text-base transition-all",
                    active
                      ? "bg-card text-foreground aura-glow"
                      : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
                  )}
                >
                  <span className="relative">
                    <Icon className={cn("h-5 w-5", active && "text-primary")} />
                    {badge > 0 ? (
                      <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground animate-howl-pulse">
                        {badge > 99 ? "99+" : badge}
                      </span>
                    ) : null}
                  </span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <Button className="btn-gold mt-6 h-12 w-full rounded-full text-base">
            <Sparkles className="h-4 w-4" />
            New Howl
          </Button>

          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border/60 bg-card/40 p-3 backdrop-blur">
            <img src={avatarUrl} alt="" className="h-10 w-10 rounded-full ring-1 ring-primary/40" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">@{handle}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 py-4 lg:py-6 animate-fade-up">
          {children}
        </main>

        {/* Right rail */}
        {rightRail && (
          <aside className="hidden w-80 shrink-0 py-6 xl:block">
            <div className="sticky top-6 space-y-4">
              <div className="glass-card rounded-3xl p-5">
                <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Trending Howls
                </h3>
                <ul className="space-y-3">
                  {trending.map((t) => (
                    <li key={t.tag} className="cursor-pointer rounded-xl p-2 transition hover:bg-muted/50">
                      <p className="font-semibold text-foreground">{t.tag}</p>
                      <p className="text-xs text-muted-foreground">{t.howls}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}