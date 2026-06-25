import { useState } from "react";
import { Megaphone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { promoteHowl, formatMoney } from "@/lib/monetization";
import { cn } from "@/lib/utils";

const DURATION_OPTIONS = [
  { days: 3, label: "3 days" },
  { days: 7, label: "7 days" },
  { days: 14, label: "14 days" },
  { days: 30, label: "30 days" },
];

const BUDGET_OPTIONS = [500, 1000, 2500, 5000];

export function PromoteHowlDialog({
  howlId,
  open,
  onOpenChange,
}: {
  howlId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [budget, setBudget] = useState(1000);
  const [days, setDays] = useState(7);
  const [customBudget, setCustomBudget] = useState("");
  const [loading, setLoading] = useState(false);

  const effectiveBudget = customBudget ? Math.round(parseFloat(customBudget) * 100) : budget;

  const handlePromote = async () => {
    if (effectiveBudget < 500) {
      toast.error("Minimum budget is $5.00");
      return;
    }
    setLoading(true);
    try {
      await promoteHowl(howlId, effectiveBudget, days);
      toast.success("Promotion submitted for review! 🚀");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Promotion failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" /> Promote this Howl
          </DialogTitle>
          <DialogDescription>Reach more wolves across the pack</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label className="mb-2 block text-xs text-muted-foreground">Budget</Label>
            <div className="flex flex-wrap gap-2">
              {BUDGET_OPTIONS.map((b) => (
                <button
                  key={b}
                  onClick={() => { setBudget(b); setCustomBudget(""); }}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                    budget === b && !customBudget
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  {formatMoney(b)}
                </button>
              ))}
            </div>
            <div className="mt-2">
              <Input
                type="number"
                min="5"
                step="1"
                placeholder="Custom budget (USD)"
                value={customBudget}
                onChange={(e) => setCustomBudget(e.target.value)}
                className="bg-card"
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 block text-xs text-muted-foreground">Duration</Label>
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d.days}
                  onClick={() => setDays(d.days)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                    days === d.days
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card/40 p-3 text-sm text-muted-foreground">
            Your Howl will appear as a <strong className="text-foreground">Sponsored</strong> post in
            Pack feeds. Promotions go live within 24 hours after review.
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-sm text-muted-foreground">
              Total: <span className="font-bold text-primary">{formatMoney(effectiveBudget)}</span> / {days}d
            </span>
            <Button
              onClick={handlePromote}
              disabled={loading || effectiveBudget < 500}
              className="btn-gold rounded-full px-6"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Promote"}
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Payment gateway integration required for live campaigns.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
