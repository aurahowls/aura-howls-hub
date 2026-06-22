import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useModRole } from "@/hooks/use-mod-role";
import {
  fetchAdminStats,
  fetchReports,
  updateReport,
  searchUsersAdmin,
  searchHowlsAdmin,
  setUserModStatus,
  setVerified,
  setFeatured,
  issueWarning,
  fetchModLogs,
  fetchAllAnnouncements,
  createAnnouncement,
  toggleAnnouncement,
  deleteAnnouncement,
  modDeleteHowl,
} from "@/lib/moderation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MaybeVerified, VerifiedBadge } from "@/components/VerifiedBadge";
import { toast } from "sonner";
import {
  Users as UsersIcon,
  FileText,
  Flag,
  Megaphone,
  ScrollText,
  Shield,
  Loader2,
  Star,
  ShieldOff,
  ShieldAlert,
  Trash2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, isModerator, loading } = useModRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isModerator) {
      toast.error("Moderators only");
      navigate({ to: "/home", replace: true });
    }
  }, [loading, isModerator, navigate]);

  if (loading) {
    return (
      <AppShell rightRail={false}>
        <p className="text-sm text-muted-foreground">Checking access…</p>
      </AppShell>
    );
  }
  if (!isModerator) return null;

  return (
    <AppShell rightRail={false}>
      <header className="mb-6 flex items-center gap-3">
        <Shield className="h-7 w-7 text-primary" />
        <h1 className="font-display text-3xl font-bold">Admin & Moderation</h1>
        {isAdmin && <Badge className="bg-primary/20 text-primary">Admin</Badge>}
      </header>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="dashboard"><FileText className="mr-1 h-4 w-4" /> Dashboard</TabsTrigger>
          <TabsTrigger value="reports"><Flag className="mr-1 h-4 w-4" /> Reports</TabsTrigger>
          <TabsTrigger value="users"><UsersIcon className="mr-1 h-4 w-4" /> Users</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="verification"><VerifiedBadge size={14} /> Verify</TabsTrigger>
          {isAdmin && <TabsTrigger value="announcements"><Megaphone className="mr-1 h-4 w-4" /> Announce</TabsTrigger>}
          <TabsTrigger value="logs"><ScrollText className="mr-1 h-4 w-4" /> Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="reports"><ReportsTab /></TabsContent>
        <TabsContent value="users"><UsersTab isAdmin={isAdmin} /></TabsContent>
        <TabsContent value="content"><ContentTab /></TabsContent>
        <TabsContent value="verification">
          <Link to="/admin/verification" className="text-sm text-primary underline">
            Open full verification queue →
          </Link>
        </TabsContent>
        {isAdmin && <TabsContent value="announcements"><AnnouncementsTab /></TabsContent>}
        <TabsContent value="logs"><LogsTab /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

function DashboardTab() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchAdminStats>> | null>(null);
  useEffect(() => { fetchAdminStats().then(setStats); }, []);
  const items = [
    { label: "Total wolves", value: stats?.totalUsers },
    { label: "Active (30d)", value: stats?.activeUsers },
    { label: "Total Howls", value: stats?.totalHowls },
    { label: "Videos", value: stats?.totalVideos },
    { label: "Echoes", value: stats?.totalEchoes },
    { label: "Pending reports", value: stats?.pendingReports },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <Card key={it.label} className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{it.label}</CardTitle></CardHeader>
          <CardContent>
            <p className="font-display text-3xl font-bold">{it.value ?? "—"}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ReportsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    setRows(await fetchReports(filter === "all" ? undefined : "pending"));
    setLoading(false);
  };
  useEffect(() => { void reload(); /* eslint-disable-next-line */ }, [filter]);

  const handleResolve = async (id: string, status: "resolved" | "dismissed") => {
    await updateReport(id, { status });
    toast.success(status === "resolved" ? "Resolved" : "Dismissed");
    reload();
  };

  const handleDeleteTarget = async (r: any) => {
    if (!confirm(`Delete this ${r.target_type}?`)) return;
    try {
      if (r.target_type === "howl") await modDeleteHowl(r.target_id, r.reason);
      else { toast.message("Manual deletion for that target type not wired"); return; }
      await updateReport(r.id, { status: "resolved", resolution_notes: "Target deleted" });
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button size="sm" variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")}>Pending</Button>
        <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All</Button>
      </div>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reports.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="glass-card rounded-2xl p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{r.target_type}</Badge>
                <Badge>{r.reason}</Badge>
                <Badge variant={r.status === "pending" ? "default" : "secondary"}>{r.status}</Badge>
                <span className="ml-auto text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Reporter: @{r.reporter?.username ?? "—"}</p>
              <p className="mt-1 text-xs font-mono text-muted-foreground">Target id: {r.target_id}</p>
              {r.details && <p className="mt-2 whitespace-pre-wrap text-sm">{r.details}</p>}
              {r.status === "pending" && (
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleResolve(r.id, "dismissed")}>Dismiss</Button>
                  {r.target_type === "howl" && (
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteTarget(r)}>
                      <Trash2 className="mr-1 h-3 w-3" /> Delete Howl
                    </Button>
                  )}
                  <Button size="sm" onClick={() => handleResolve(r.id, "resolved")}>Resolve</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UsersTab({ isAdmin }: { isAdmin: boolean }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!q.trim()) { setResults([]); return; }
      setBusy(true);
      setResults(await searchUsersAdmin(q));
      setBusy(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const action = async (id: string, fn: () => Promise<void>, msg: string) => {
    try { await fn(); toast.success(msg); setResults((rs) => [...rs]); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  return (
    <div className="space-y-4">
      <Input placeholder="Search wolves by username or name…" value={q} onChange={(e) => setQ(e.target.value)} />
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      <ul className="space-y-2">
        {results.map((u) => (
          <li key={u.id} className="glass-card flex flex-wrap items-center gap-3 rounded-2xl p-3">
            <img src={u.avatar_url ?? `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(u.username)}`} alt="" className="h-9 w-9 rounded-full" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate text-sm font-semibold">
                {u.display_name ?? u.username}
                <MaybeVerified verified={u.is_verified} size={12} />
              </p>
              <p className="truncate text-xs text-muted-foreground">@{u.username} · {u.followers_count ?? 0} pack · status: {u.mod_status}</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {isAdmin && (
                <Button size="sm" variant="outline"
                  onClick={() => action(u.id, () => setVerified(u.id, !u.is_verified), u.is_verified ? "Badge removed" : "Verified")}>
                  <VerifiedBadge size={12} /> {u.is_verified ? "Unverify" : "Verify"}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => {
                const reason = prompt("Warning reason?"); if (reason) action(u.id, () => issueWarning(u.id, reason), "Warning issued");
              }}><ShieldAlert className="mr-1 h-3 w-3" /> Warn</Button>
              <Button size="sm" variant="outline" onClick={() => {
                const days = Number(prompt("Suspend for how many days?", "7")); if (!days) return;
                const until = new Date(Date.now() + days * 86400_000).toISOString();
                action(u.id, () => setUserModStatus(u.id, "suspended", { until, reason: `${days}d` }), "Suspended");
              }}>Suspend</Button>
              <Button size="sm" variant="outline" onClick={() => action(u.id, () => setUserModStatus(u.id, "shadow_banned"), "Shadow-banned")}>
                <ShieldOff className="mr-1 h-3 w-3" /> Shadow
              </Button>
              {isAdmin && (
                <Button size="sm" variant="destructive" onClick={() => {
                  if (confirm("Permanently ban this wolf?")) action(u.id, () => setUserModStatus(u.id, "banned"), "Banned");
                }}>Ban</Button>
              )}
              <Button size="sm" variant="outline" onClick={() => action(u.id, () => setUserModStatus(u.id, "active"), "Restored")}>
                Restore
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContentTab() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!q.trim()) { setResults([]); return; }
      setResults(await searchHowlsAdmin(q));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const doDelete = async (id: string) => {
    if (!confirm("Delete this Howl?")) return;
    try { await modDeleteHowl(id, "admin action"); toast.success("Deleted"); setResults((rs) => rs.filter((r) => r.id !== id)); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };
  const doFeature = async (id: string, on: boolean) => {
    try { await setFeatured(id, on); toast.success(on ? "Featured" : "Unfeatured"); setResults((rs) => rs.map((r) => r.id === id ? { ...r, featured_at: on ? new Date().toISOString() : null } : r)); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  return (
    <div className="space-y-4">
      <Input placeholder="Search Howl content…" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="space-y-2">
        {results.map((h) => (
          <li key={h.id} className="glass-card rounded-2xl p-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm">{h.content || <span className="italic text-muted-foreground">(no text)</span>}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(h.created_at).toLocaleString()} · 🐺 {h.howl_count} · 💬 {h.echo_count} · 👁 {h.view_count}
                  {h.featured_at && <span className="ml-2 text-primary">★ Featured</span>}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <Button size="sm" variant="outline" onClick={() => doFeature(h.id, !h.featured_at)}>
                  <Star className="mr-1 h-3 w-3" /> {h.featured_at ? "Unfeature" : "Feature"}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => doDelete(h.id)}>
                  <Trash2 className="mr-1 h-3 w-3" /> Delete
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AnnouncementsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = async () => setRows(await fetchAllAnnouncements());
  useEffect(() => { void reload(); }, []);

  const create = async () => {
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    try { await createAnnouncement(title, body); setTitle(""); setBody(""); await reload(); toast.success("Posted to the pack"); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">New announcement</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Body" value={body} onChange={(e) => setBody(e.target.value)} />
          <Button onClick={create} disabled={busy} className="btn-gold rounded-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send to all wolves"}
          </Button>
        </CardContent>
      </Card>
      <ul className="space-y-2">
        {rows.map((a) => (
          <li key={a.id} className="glass-card rounded-2xl p-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{a.title}</p>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
              </div>
              <div className="flex flex-col gap-1">
                <Button size="sm" variant="outline" onClick={async () => { await toggleAnnouncement(a.id, !a.active); reload(); }}>
                  {a.active ? "Disable" : "Enable"}
                </Button>
                <Button size="sm" variant="destructive" onClick={async () => { if (confirm("Delete?")) { await deleteAnnouncement(a.id); reload(); } }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LogsTab() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { fetchModLogs().then(setRows); }, []);
  return (
    <ul className="space-y-2 text-sm">
      {rows.map((l) => (
        <li key={l.id} className="glass-card rounded-xl p-3 font-mono text-xs">
          <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>{" "}
          <span className="text-primary">{l.action}</span>{" "}
          <span>· {l.target_type} {l.target_id ?? ""}</span>
          {l.notes && <p className="mt-1 text-muted-foreground">{l.notes}</p>}
        </li>
      ))}
      {rows.length === 0 && <p className="text-muted-foreground">No actions logged yet.</p>}
    </ul>
  );
}