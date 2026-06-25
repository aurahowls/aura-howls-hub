import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, MailCheck, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/verify-email")({
  head: () => ({
    meta: [{ title: "Verify Email — AuraHowls" }],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      setEmail(data.user.email ?? null);
      setIsVerified(!!data.user.email_confirmed_at);
    });
  }, [navigate]);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email_confirmed_at) {
        setIsVerified(true);
        setTimeout(() => navigate({ to: "/home", replace: true }), 2000);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  async function resend() {
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/home` },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Verification email sent 🌙");
    }
  }

  if (isVerified) {
    return (
      <AuthShell title="Email verified!" subtitle="Redirecting you to your den…">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <CheckCircle className="h-16 w-16 text-primary" />
          <p className="text-sm text-muted-foreground">Your email is confirmed. Welcome to the pack 🐺</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Verify your email."
      subtitle="Check your inbox and click the link to activate your den."
      footer={
        <Link to="/home" className="text-muted-foreground hover:text-foreground">
          Skip for now →
        </Link>
      }
    >
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <MailCheck className="h-10 w-10 text-primary" />
          </div>
        </div>
        {email && (
          <p className="text-sm text-muted-foreground">
            We sent a verification link to{" "}
            <span className="font-medium text-foreground">{email}</span>.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Didn't receive it? Check your spam folder.
        </p>
        <Button
          onClick={resend}
          disabled={loading}
          variant="outline"
          className="w-full rounded-full"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resend verification email"}
        </Button>
      </div>
    </AuthShell>
  );
}
