import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [{ title: "Reset Password — AuraHowls" }],
  }),
  component: ForgotPasswordPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
});

function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = schema.safeParse({ email: form.get("email") });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSentTo(parsed.data.email);
    setSent(true);
  }

  return (
    <AuthShell
      title="Recover your den."
      subtitle="We'll send a password reset link to your email."
      footer={
        <Link to="/auth" className="text-muted-foreground hover:text-foreground">
          ← Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <MailCheck className="h-8 w-8 text-primary" />
            </div>
          </div>
          <p className="font-semibold">Check your inbox 🌙</p>
          <p className="text-sm text-muted-foreground">
            We sent a password reset link to{" "}
            <span className="font-medium text-foreground">{sentTo}</span>. The link expires in 1 hour.
          </p>
          <p className="text-xs text-muted-foreground">
            Didn't receive it? Check your spam folder, or{" "}
            <button
              className="text-primary underline underline-offset-2"
              onClick={() => setSent(false)}
            >
              try again
            </button>
            .
          </p>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="wolf@aurahowls.dev"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="btn-gold h-12 w-full rounded-full text-base"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Link"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
