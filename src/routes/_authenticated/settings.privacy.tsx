import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { fetchMyBlocks, fetchMyMutes, unblockUser, unmuteUser, fetchMyWarnings, acknowledgeWarning } from "@/lib/moderation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [mutes, setMutes] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<any[]>([]);

  const reload = async () => {
    const [b, m, w] = await Promise.all([fetchMyBlocks(), fetchMyMutes(), fetchMyWarnings()]);
    setBlocks(b); setMutes(m); setWarnings(w);
  };
  useEffect(() => { void reload(); }, []);

  return (
    <AppShell rightRail={false}>
      <h1 className="mb-6 font-display text-3xl font-bold">Privacy & Safety</h1>

      <Tabs defaultValue="blocks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="blocks">Blocked</TabsTrigger>
          <TabsTrigger value="mutes">Muted</TabsTrigger>
          <TabsTrigger value="warnings">My warnings</TabsTrigger>
        </TabsList>
        <TabsContent value="blocks">
          <UserList rows={blocks} action="Unblock" onAction={async (id) => { await unblockUser(id); toast.success("Unblocked"); reload(); }} empty="No wolves blocked." />
        </TabsContent>
        <TabsContent value="mutes">
          <UserList rows={mutes} action="Unmute" onAction={async (id) => { await unmuteUser(id); toast.success("Unmuted"); reload(); }} empty="No wolves muted." />
        </TabsContent>
        <TabsContent value="warnings">
          {warnings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No warnings — clean record. 🌙</p>
          ) : (
            <ul className="space-y-2">
              {warnings.map((w) => (
                <li key={w.id} className="glass-card rounded-2xl p-4">
                  <p className="flex items-center gap-2 font-semibold"><ShieldAlert className="h-4 w-4 text-destructive" /> Warning</p>
                  <p className="mt-1 text-sm">{w.reason}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(w.created_at).toLocaleString()}</p>
                  {!w.acknowledged_at && (
                    <Button size="sm" className="mt-2" onClick={async () => { await acknowledgeWarning(w.id); reload(); }}>I understand</Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function UserList({ rows, action, onAction, empty }: {
  rows: any[];
  action: string;
  onAction: (id: string) => void | Promise<void>;
  empty: string;
}) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="space-y-2">
      {rows.map((u) => (
        <li key={u.id} className="glass-card flex items-center gap-3 rounded-2xl p-3">
          <img src={u.avatar_url ?? `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(u.username)}`} alt="" className="h-9 w-9 rounded-full" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{u.display_name ?? u.username}</p>
            <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => onAction(u.id)}>{action}</Button>
        </li>
      ))}
    </ul>
  );
}