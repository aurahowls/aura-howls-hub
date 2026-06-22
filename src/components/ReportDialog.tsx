import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitReport, type ReportTarget } from "@/lib/moderation";
import { toast } from "sonner";
import { Loader2, Flag } from "lucide-react";

const REASONS = [
  "Spam",
  "Harassment or bullying",
  "Hate speech",
  "Violence or threats",
  "Sexual or explicit content",
  "Misinformation",
  "Impersonation",
  "Self-harm",
  "Other",
];

export function ReportDialog({
  open,
  onOpenChange,
  target_type,
  target_id,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  target_type: ReportTarget;
  target_id: string;
}) {
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await submitReport({ target_type, target_id, reason, details });
      toast.success("Reported — moderators will review it");
      onOpenChange(false);
      setDetails("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to report");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-destructive" /> Report {target_type}
          </DialogTitle>
          <DialogDescription>
            Reports are anonymous to the reported wolf and reviewed by moderators.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Details (optional)</Label>
            <Textarea
              maxLength={2000}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Anything moderators should know"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy} className="btn-gold rounded-full px-4">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}