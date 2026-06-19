import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pack")({
  component: PackLayout,
});

const tabs = [
  { to: "/pack", label: "Pack Members" },
  { to: "/pack/following", label: "Following Pack" },
  { to: "/pack/suggested", label: "Suggested" },
] as const;

function PackLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <AppShell rightRail={false}>
      <h1 className="mb-4 font-display text-3xl font-bold">Your Pack</h1>
      <div className="mb-5 flex gap-2 border-b border-border">
        {tabs.map((t) => {
          const active = pathname === t.to || (t.to === "/pack" && pathname === "/pack/");
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "px-4 py-3 text-sm font-medium transition",
                active
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </AppShell>
  );
}