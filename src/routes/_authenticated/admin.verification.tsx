import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { fetchAllRequests, isAdmin, reviewRequest } from "@/lib/verification";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/verification")({
  component: AdminVerificationPage,
});

function AdminVerificationPage() {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchAllRequests>>>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    setRows(await fetchAllRequests());
    setLoading(false);
  };

  useEffect(() => {
    void isAdmin().then((ok) => {
      setAllowed(ok);
      if (!ok) {
        toast.error("Admins only");
        navigate({ to: "/home", replace: true });
      } else {
        void reload();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (allowed === null) return <AppShell><p className="text-sm text-muted-foreground">Checking…</p></AppShell>;
  if (!allowed) return null;

  const review = async (id: string, status: "approved" | "rejected") => {
    try {
      await reviewRequest(id, status);
      toast.success(status === "approved" ? "Verified" : "Rejected");
      await reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  return (
    <AppShell rightRail={false}>
      <header className="mb-6 flex items-center gap-3">
        <VerifiedBadge size={28} />
        <h1 className="font-display text-3xl font-bold">Verification queue</h1>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No requests in the queue.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <img
                  src={r.avatar_url ?? `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(r.username ?? r.user_id)}`}
                  alt=""
                  className="h-10 w-10 rounded-full ring-1 ring-border"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.display_name ?? r.username ?? r.user_id}</p>
                  <p className="truncate text-xs text-muted-foreground">@{r.username ?? "—"} · {new Date(r.created_at).toLocaleString()}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs ${r.status === "pending" ? "bg-muted text-muted-foreground" : r.status === "approved" ? "bg-emerald-500/20 text-emerald-300" : "bg-destructive/20 text-destructive"}`}>
                  {r.status}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm">{r.reason}</p>
              {r.status === "pending" && (
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => review(r.id, "rejected")}>Reject</Button>
                  <Button size="sm" className="btn-gold rounded-full px-4" onClick={() => review(r.id, "approved")}>Approve</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}