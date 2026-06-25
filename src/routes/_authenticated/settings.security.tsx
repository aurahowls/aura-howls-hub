import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { fetchSecurityEvents, recordSecurityEvent, checkPasswordStrength } from "@/lib/security";
import { toast } from "sonner";
import {
  Loader2, Monitor, Smartphone, LogOut, ShieldCheck,
  Key, Clock, AlertTriangle, CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings/security")({
  component: SecuritySettingsPage,
});

const pwSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    password: z.string().min(8, "New password must be at least 8 characters").max(72),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });

const STRENGTH_COLORS: Record<string, string> = {
  weak: "bg-destructive",
  fair: "bg-yellow-500",
  strong: "bg-emerald-400",
  very_strong: "bg-primary",
};

const EVENT_LABELS: Record<string, string> = {
  login: "Signed in",
  logout: "Signed out",
  password_change: "Password changed",
  password_reset: "Password reset",
  email_change: "Email changed",
  session_revoked_all: "All sessions revoked",
};

const EVENT_ICONS: Record<string, React.FC<{ className?: string }>> = {
  login: CheckCircle,
  logout: LogOut,
  password_change: Key,
  password_reset: ShieldCheck,
  session_revoked_all: AlertTriangle,
};

function SecuritySettingsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Awaited<ReturnType<typeof fetchSecurityEvents>>>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [savingPw, setSavingPw] = useState(false);
  const [revokingAll, setRevokingAll] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [sendingVerify, setSendingVerify] = useState(false);

  useEffect(() => {
    setLoadingEvents(true);
    fetchSecurityEvents(30)
      .then(setEvents)
      .finally(() => setLoadingEvents(false));

    supabase.auth.getUser().then(({ data }) => {
      setEmailVerified(!!data.user?.email_confirmed_at);
    });
  }, []);

  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = pwSchema.safeParse({
      current: form.get("current"),
      password: form.get("password"),
      confirm: form.get("confirm"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSavingPw(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user?.email) { setSavingPw(false); return; }
    // Re-authenticate first
    const { error: reAuthErr } = await supabase.auth.signInWithPassword({
      email: u.user.email,
      password: parsed.data.current,
    });
    if (reAuthErr) {
      setSavingPw(false);
      toast.error("Current password is incorrect");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setSavingPw(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await recordSecurityEvent("password_change");
    setEvents((prev) => [
      { id: crypto.randomUUID(), event_type: "password_change", user_agent: null, device_hint: null, created_at: new Date().toISOString(), metadata: null },
      ...prev,
    ]);
    toast.success("Password updated 🌙");
    (e.target as HTMLFormElement).reset();
    setNewPassword("");
  }

  async function handleRevokeAll() {
    setRevokingAll(true);
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) {
      setRevokingAll(false);
      toast.error(error.message);
      return;
    }
    await recordSecurityEvent("session_revoked_all");
    navigate({ to: "/auth", replace: true });
  }

  async function resendVerification() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user?.email) return;
    setSendingVerify(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: u.user.email,
      options: { emailRedirectTo: `${window.location.origin}/home` },
    });
    setSendingVerify(false);
    if (error) toast.error(error.message);
    else toast.success("Verification email sent 🌙");
  }

  const { strength, score, hints } = checkPasswordStrength(newPassword);

  return (
    <AppShell rightRail={false}>
      <h1 className="mb-6 font-display text-3xl font-bold">Security</h1>

      <Tabs defaultValue="password" className="space-y-4">
        <TabsList>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="log">Activity Log</TabsTrigger>
        </TabsList>

        {/* ── Password ── */}
        <TabsContent value="password">
          <div className="space-y-4">
            {/* Email verification status */}
            <div className="glass-card rounded-3xl p-6">
              <h2 className="mb-4 font-display text-xl font-bold">Email Verification</h2>
              {emailVerified === null ? (
                <p className="text-sm text-muted-foreground">Checking…</p>
              ) : emailVerified ? (
                <div className="flex items-center gap-3 text-sm text-emerald-400">
                  <CheckCircle className="h-5 w-5 shrink-0" />
                  <span>Your email is verified.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-yellow-400">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <span>Your email is not yet verified.</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={sendingVerify}
                    onClick={resendVerification}
                    className="rounded-full"
                  >
                    {sendingVerify ? <Loader2 className="h-3 w-3 animate-spin" /> : "Resend verification email"}
                  </Button>
                </div>
              )}
            </div>

            {/* Change password */}
            <div className="glass-card rounded-3xl p-6">
              <h2 className="mb-4 font-display text-xl font-bold">Change Password</h2>
              <form className="space-y-4" onSubmit={handleChangePassword}>
                <div className="space-y-2">
                  <Label htmlFor="current">Current password</Label>
                  <Input id="current" name="current" type="password" autoComplete="current-password" required placeholder="Your current password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  {newPassword.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={cn("h-1 flex-1 rounded-full transition-colors", score > i ? STRENGTH_COLORS[strength] : "bg-muted")}
                          />
                        ))}
                      </div>
                      <p className="text-xs capitalize text-muted-foreground">{strength.replace("_", " ")}</p>
                      {hints.length > 0 && <p className="text-xs text-muted-foreground">{hints[0]}</p>}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm new password</Label>
                  <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} placeholder="Repeat new password" />
                </div>
                <Button type="submit" disabled={savingPw} className="btn-gold rounded-full px-6">
                  {savingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
                </Button>
              </form>
            </div>
          </div>
        </TabsContent>

        {/* ── Sessions ── */}
        <TabsContent value="sessions">
          <div className="glass-card rounded-3xl p-6 space-y-4">
            <h2 className="font-display text-xl font-bold">Session Management</h2>
            <p className="text-sm text-muted-foreground">
              Signing out from all devices will immediately invalidate every active session,
              including this one. You'll need to sign in again.
            </p>
            <div className="rounded-2xl border border-border bg-card/40 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Monitor className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Current session</p>
                  <p className="text-xs text-muted-foreground">{navigator.userAgent.split(" ").slice(-1)[0]}</p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                  Active
                </span>
              </div>
            </div>
            <Button
              variant="destructive"
              onClick={handleRevokeAll}
              disabled={revokingAll}
              className="rounded-full"
            >
              {revokingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <LogOut className="h-4 w-4" /> Log out from all devices
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* ── Activity Log ── */}
        <TabsContent value="log">
          <div className="glass-card rounded-3xl p-6 space-y-4">
            <h2 className="font-display text-xl font-bold">Security Activity</h2>
            {loadingEvents ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : events.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No security events recorded yet.</p>
            ) : (
              <ul className="space-y-2">
                {events.map((ev) => {
                  const Icon = EVENT_ICONS[ev.event_type] ?? ShieldCheck;
                  const label = EVENT_LABELS[ev.event_type] ?? ev.event_type.replace(/_/g, " ");
                  const isSuspicious = ev.event_type === "session_revoked_all";
                  return (
                    <li key={ev.id} className="flex items-start gap-3 rounded-2xl border border-border/50 bg-card/30 p-3">
                      <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", isSuspicious ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium capitalize">{label}</p>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                          {ev.device_hint && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              {ev.device_hint.includes("iOS") || ev.device_hint.includes("Android") ? (
                                <Smartphone className="h-3 w-3" />
                              ) : (
                                <Monitor className="h-3 w-3" />
                              )}
                              {ev.device_hint}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(ev.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
