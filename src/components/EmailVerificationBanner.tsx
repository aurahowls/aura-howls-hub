import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmailVerificationBanner({ email }: { email: string | undefined }) {
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);

  if (dismissed || !email) return null;

  async function resend() {
    if (!email) return;
    setSending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/home` },
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Verification email sent — check your inbox 🌙");
    }
  }

  return (
    <div className="border-b border-yellow-500/30 bg-yellow-500/10 px-4 py-2.5">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <Mail className="h-4 w-4 shrink-0 text-yellow-500" />
        <p className="min-w-0 flex-1 text-xs text-yellow-200/90">
          <span className="font-semibold">Verify your email</span> to unlock all features.{" "}
          <Link to="/verify-email" className="underline underline-offset-2 hover:text-yellow-100">
            Learn more
          </Link>
        </p>
        <Button
          size="sm"
          variant="ghost"
          disabled={sending}
          onClick={resend}
          className="h-7 shrink-0 rounded-full px-3 text-xs text-yellow-300 hover:bg-yellow-500/20 hover:text-yellow-100"
        >
          {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Resend"}
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="rounded-full p-1 text-yellow-400/70 hover:bg-yellow-500/20 hover:text-yellow-200"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
