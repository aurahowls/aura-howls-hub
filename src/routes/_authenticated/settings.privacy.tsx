import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchMyBlocks, fetchMyMutes, unblockUser, unmuteUser, fetchMyWarnings, acknowledgeWarning } from "@/lib/moderation";
import { fetchPrivacySettings, savePrivacySettings, type PrivacySettings } from "@/lib/privacy";
import { toast } from "sonner";
import { ShieldAlert, Loader2, Lock, Globe, Eye, MessageSquare, AtSign } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings/privacy")({
  component: PrivacyPage,
});

const DEFAULTS: PrivacySettings = {
  is_private: false,
  hide_online_status: false,
  disable_dms: false,
  restrict_mentions: "everyone",
  restrict_comments: "everyone",
};

function PrivacyPage() {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [mutes, setMutes] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [privacy, setPrivacy] = useState<PrivacySettings>(DEFAULTS);
  const [loadingPrivacy, setLoadingPrivacy] = useState(true);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  const reload = async () => {
    const [b, m, w] = await Promise.all([fetchMyBlocks(), fetchMyMutes(), fetchMyWarnings()]);
    setBlocks(b); setMutes(m); setWarnings(w);
  };

  useEffect(() => {
    void reload();
    setLoadingPrivacy(true);
    fetchPrivacySettings()
      .then(setPrivacy)
      .finally(() => setLoadingPrivacy(false));
  }, []);

  async function handleSavePrivacy() {
    setSavingPrivacy(true);
    try {
      await savePrivacySettings(privacy);
      toast.success("Privacy settings saved 🌙");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSavingPrivacy(false);
    }
  }

  return (
    <AppShell rightRail={false}>
      <h1 className="mb-6 font-display text-3xl font-bold">Privacy & Safety</h1>

      <Tabs defaultValue="privacy" className="space-y-4">
        <TabsList>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="blocks">Blocked</TabsTrigger>
          <TabsTrigger value="mutes">Muted</TabsTrigger>
          <TabsTrigger value="warnings">Warnings</TabsTrigger>
        </TabsList>

        {/* ── Privacy controls ── */}
        <TabsContent value="privacy">
          <div className="space-y-4">
            {loadingPrivacy ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Account visibility */}
                <section className="glass-card rounded-3xl p-6 space-y-4">
                  <h2 className="font-display text-lg font-bold flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" /> Account Visibility
                  </h2>
                  <PrivacyToggle
                    icon={<Lock className="h-4 w-4" />}
                    label="Private account"
                    description="Only approved followers can see your Howls and profile."
                    checked={privacy.is_private}
                    onCheckedChange={(v) => setPrivacy((p) => ({ ...p, is_private: v }))}
                  />
                  <PrivacyToggle
                    icon={<Eye className="h-4 w-4" />}
                    label="Hide online status"
                    description="Other wolves won't see when you were last active."
                    checked={privacy.hide_online_status}
                    onCheckedChange={(v) => setPrivacy((p) => ({ ...p, hide_online_status: v }))}
                  />
                </section>

                {/* Messaging */}
                <section className="glass-card rounded-3xl p-6 space-y-4">
                  <h2 className="font-display text-lg font-bold flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" /> Messaging & Interactions
                  </h2>
                  <PrivacyToggle
                    icon={<MessageSquare className="h-4 w-4" />}
                    label="Disable Pack DMs"
                    description="No one can send you direct messages."
                    checked={privacy.disable_dms}
                    onCheckedChange={(v) => setPrivacy((p) => ({ ...p, disable_dms: v }))}
                  />
                  <div className="space-y-2 border-t border-border pt-4">
                    <div className="flex items-start gap-3">
                      <AtSign className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1 space-y-1">
                        <Label className="text-sm font-medium">Who can mention you</Label>
                        <p className="text-xs text-muted-foreground">Control who can @mention you in Howls.</p>
                      </div>
                    </div>
                    <Select
                      value={privacy.restrict_mentions}
                      onValueChange={(v) => setPrivacy((p) => ({ ...p, restrict_mentions: v as PrivacySettings["restrict_mentions"] }))}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="everyone">
                          <span className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> Everyone</span>
                        </SelectItem>
                        <SelectItem value="followers">Followers only</SelectItem>
                        <SelectItem value="nobody">Nobody</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 border-t border-border pt-4">
                    <div className="flex items-start gap-3">
                      <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1 space-y-1">
                        <Label className="text-sm font-medium">Who can Echo (comment) on your Howls</Label>
                        <p className="text-xs text-muted-foreground">Restrict who can reply to your posts.</p>
                      </div>
                    </div>
                    <Select
                      value={privacy.restrict_comments}
                      onValueChange={(v) => setPrivacy((p) => ({ ...p, restrict_comments: v as PrivacySettings["restrict_comments"] }))}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="everyone">
                          <span className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> Everyone</span>
                        </SelectItem>
                        <SelectItem value="followers">Followers only</SelectItem>
                        <SelectItem value="nobody">Nobody</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </section>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSavePrivacy}
                    disabled={savingPrivacy}
                    className="btn-gold rounded-full px-6"
                  >
                    {savingPrivacy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Privacy Settings"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* ── Blocked ── */}
        <TabsContent value="blocks">
          <UserList
            rows={blocks}
            action="Unblock"
            onAction={async (id) => { await unblockUser(id); toast.success("Unblocked"); reload(); }}
            empty="No wolves blocked."
          />
        </TabsContent>

        {/* ── Muted ── */}
        <TabsContent value="mutes">
          <UserList
            rows={mutes}
            action="Unmute"
            onAction={async (id) => { await unmuteUser(id); toast.success("Unmuted"); reload(); }}
            empty="No wolves muted."
          />
        </TabsContent>

        {/* ── Warnings ── */}
        <TabsContent value="warnings">
          {warnings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No warnings — clean record. 🌙</p>
          ) : (
            <ul className="space-y-2">
              {warnings.map((w) => (
                <li key={w.id} className="glass-card rounded-2xl p-4">
                  <p className="flex items-center gap-2 font-semibold">
                    <ShieldAlert className="h-4 w-4 text-destructive" /> Warning
                  </p>
                  <p className="mt-1 text-sm">{w.reason}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(w.created_at).toLocaleString()}</p>
                  {!w.acknowledged_at && (
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={async () => { await acknowledgeWarning(w.id); reload(); }}
                    >
                      I understand
                    </Button>
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

function PrivacyToggle({
  icon,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex items-start justify-between gap-4 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-muted-foreground">{icon}</span>
        <div>
          <Label htmlFor={id} className="cursor-pointer font-medium">{label}</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
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
          <img
            src={u.avatar_url ?? `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(u.username)}`}
            alt=""
            className="h-9 w-9 rounded-full"
          />
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
