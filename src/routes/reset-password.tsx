import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { recordSecurityEvent, checkPasswordStrength } from "@/lib/security";
import { toast } from "sonner";
import { Loader2, CheckCircle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "Set New Password — AuraHowls" }],
  }),
  component: ResetPasswordPage,
});

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
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

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");

  // Supabase auto-exchanges the hash fragment on page load
  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setHasSession(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setHasSession(true);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      password: form.get("password"),
      confirm: form.get("confirm"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await recordSecurityEvent("password_change");
    setDone(true);
    setTimeout(() => navigate({ to: "/home", replace: true }), 2500);
  }

  const { strength, score, hints } = checkPasswordStrength(password);

  if (done) {
    return (
      <AuthShell title="Password updated!" subtitle="You'll be redirected to your den shortly.">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <CheckCircle className="h-16 w-16 text-primary" />
          <p className="text-sm text-muted-foreground">Your new password is set. Welcome back, wolf 🐺</p>
        </div>
      </AuthShell>
    );
  }

  if (!hasSession) {
    return (
      <AuthShell
        title="Link expired."
        subtitle="This reset link is invalid or has already been used."
        footer={<Link to="/forgot-password" className="text-primary hover:underline">Request a new link →</Link>}
      >
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <ShieldCheck className="h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Password reset links expire after 1 hour. Please request a new one.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Set a new password."
      subtitle="Choose something strong — your den deserves it."
      footer={
        <Link to="/auth" className="text-muted-foreground hover:text-foreground">
          ← Back to sign in
        </Link>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {password.length > 0 && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors",
                      score > i ? STRENGTH_COLORS[strength] : "bg-muted",
                    )}
                  />
                ))}
              </div>
              <p className="text-xs capitalize text-muted-foreground">{strength.replace("_", " ")}</p>
              {hints.length > 0 && (
                <p className="text-xs text-muted-foreground">{hints[0]}</p>
              )}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Repeat your password"
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="btn-gold h-12 w-full rounded-full text-base"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
        </Button>
      </form>
    </AuthShell>
  );
}
