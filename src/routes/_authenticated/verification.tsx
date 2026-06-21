import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { fetchMyRequest, submitRequest, isAdmin, type VerificationRequest } from "@/lib/verification";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/verification")({
  component: VerificationPage,
});

function VerificationPage() {
  const { profile } = useCurrentUser();
  const [req, setReq] = useState<VerificationRequest | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    void fetchMyRequest().then(setReq);
    void isAdmin().then(setAdmin);
  }, []);

  const submit = async () => {
    if (reason.trim().length < 20) {
      toast.error("Please describe yourself in at least 20 characters");
      return;
    }
    setBusy(true);
    try {
      await submitRequest(reason);
      toast.success("Request submitted — a pack elder will review it");
      setReq(await fetchMyRequest());
      setReason("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to submit");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell rightRail={false}>
      <header className="mb-6 flex items-center gap-3">
        <VerifiedBadge size={32} />
        <div>
          <h1 className="font-display text-3xl font-bold">Get verified</h1>
          <p className="text-sm text-muted-foreground">Earn the red wolf badge of AuraHowls-Hub</p>
        </div>
      </header>

      <div className="glass-card rounded-3xl p-5">
        {profile?.is_verified ? (
          <div className="flex items-center gap-3">
            <VerifiedBadge size={24} />
            <div>
              <p className="font-display text-lg">You're verified, alpha.</p>
              <p className="text-sm text-muted-foreground">The red wolf badge will appear next to your name across AuraHowls-Hub.</p>
            </div>
          </div>
        ) : req?.status === "pending" ? (
          <p className="text-sm">Your request is in review. We'll let you know when an elder responds.</p>
        ) : req?.status === "rejected" ? (
          <>
            <p className="mb-3 text-sm">Your previous request was declined. Refine your reason and try again below.</p>
            <RequestForm reason={reason} setReason={setReason} busy={busy} onSubmit={submit} />
          </>
        ) : (
          <RequestForm reason={reason} setReason={setReason} busy={busy} onSubmit={submit} />
        )}
      </div>

      {admin && (
        <Link
          to="/admin/verification"
          className="mt-4 inline-block rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/15"
        >
          Open admin review queue →
        </Link>
      )}
    </AppShell>
  );
}

function RequestForm({
  reason, setReason, busy, onSubmit,
}: {
  reason: string; setReason: (s: string) => void; busy: boolean; onSubmit: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Tell us why your wolf deserves the red badge — notable identity, public figure, creator, journalist, brand, etc.
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={500}
        placeholder="Why should you be verified?"
        className="min-h-[120px] w-full rounded-xl border border-border bg-background/60 p-3 text-sm outline-none focus:border-primary/50"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{reason.length}/500</span>
        <Button onClick={onSubmit} disabled={busy} className="btn-gold rounded-full px-6">
          {busy ? "Submitting…" : "Submit request"}
        </Button>
      </div>
    </div>
  );
}