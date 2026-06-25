import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { recordSecurityEvent } from "@/lib/security";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Enter the Pack — AuraHowls" },
      { name: "description", content: "Sign in or join AuraHowls — the wolf-themed social network." },
    ],
  }),
  component: AuthPage,
});

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

const signUpSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "At least 3 characters")
    .max(24, "At most 24 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers and underscores only"),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});

const REMEMBER_KEY = "aurahowls:remember";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);

  // Redirect away if already signed in
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled && data.user) navigate({ to: "/home", replace: true });
    });
    return () => { cancelled = true; };
  }, [navigate]);

  // Respect "remember me": if unchecked, end session when the tab closes
  useEffect(() => {
    const ephemeral = sessionStorage.getItem(REMEMBER_KEY) === "false";
    if (!ephemeral) return;
    const handler = () => {
      void supabase.auth.signOut();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = signInSchema.safeParse({
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    const remember = form.get("remember") === "on";
    sessionStorage.setItem(REMEMBER_KEY, String(remember));
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await recordSecurityEvent("login");
    toast.success("Welcome back to the pack 🐺");
    navigate({ to: "/home", replace: true });
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      username: form.get("username"),
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/home`,
        data: { username: parsed.data.username, display_name: parsed.data.username },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Your den is forged 🌙 — check your email to verify your account.");
    navigate({ to: "/verify-email", replace: true });
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      toast.error(result.error.message ?? "Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/home", replace: true });
  }

  return (
    <AuthShell
      title={mode === "signin" ? "Welcome back, wolf." : "Forge your den."}
      subtitle={mode === "signin" ? "Sign in to rejoin your Pack." : "Pick a howl name and join the wild."}
      footer={
        <Link to="/" className="text-muted-foreground hover:text-foreground">
          ← Back to home
        </Link>
      }
    >
      <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
        <TabsList className="grid w-full grid-cols-2 rounded-full bg-muted/40 p-1">
          <TabsTrigger value="signin" className="rounded-full">Sign in</TabsTrigger>
          <TabsTrigger value="signup" className="rounded-full">Join the Pack</TabsTrigger>
        </TabsList>

        <TabsContent value="signin" className="space-y-4 pt-5">
          <form className="space-y-4" onSubmit={handleSignIn}>
            <div className="space-y-2">
              <Label htmlFor="email-in">Email</Label>
              <Input id="email-in" name="email" type="email" autoComplete="email" required placeholder="wolf@aurahowls.dev" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-in">Password</Label>
              <Input id="password-in" name="password" type="password" autoComplete="current-password" required placeholder="••••••••" />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox name="remember" defaultChecked /> Remember me
              </label>
              <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" disabled={loading} className="btn-gold h-12 w-full rounded-full text-base">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enter the Den"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="signup" className="space-y-4 pt-5">
          <form className="space-y-4" onSubmit={handleSignUp}>
            <div className="space-y-2">
              <Label htmlFor="username">Howl name</Label>
              <Input id="username" name="username" autoComplete="username" required placeholder="luna" maxLength={24} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-up">Email</Label>
              <Input id="email-up" name="email" type="email" autoComplete="email" required placeholder="wolf@aurahowls.dev" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-up">Password</Label>
              <Input id="password-up" name="password" type="password" autoComplete="new-password" required minLength={8} placeholder="At least 8 characters" />
            </div>
            <Button type="submit" disabled={loading} className="btn-gold h-12 w-full rounded-full text-base">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Awaken my Aura"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <div className="relative my-2 text-center text-xs uppercase tracking-wider text-muted-foreground">
        <span className="bg-card/70 px-2 backdrop-blur">or continue with</span>
        <span className="absolute left-0 right-0 top-1/2 -z-10 h-px bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleGoogle}
        disabled={loading}
        className="h-11 w-full rounded-full border-border bg-card/40 backdrop-blur hover:bg-card"
      >
        <GoogleIcon /> Continue with Google
      </Button>
    </AuthShell>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.3-1.7 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.2 14.7 2.2 12 2.2 6.5 2.2 2 6.7 2 12.2s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.7H12z" />
    </svg>
  );
}