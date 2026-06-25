import { useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { sendTip, formatMoney } from "@/lib/monetization";
import { cn } from "@/lib/utils";

const PRESET_AMOUNTS = [50, 100, 200, 500, 1000];

export function TipButton({
  recipientId,
  recipientName,
  howlId,
  className,
}: {
  recipientId: string;
  recipientName: string;
  howlId?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const effectiveAmount = customAmount ? Math.round(parseFloat(customAmount) * 100) : amount;

  const handleSend = async () => {
    if (effectiveAmount < 50) {
      toast.error("Minimum tip is $0.50");
      return;
    }
    setLoading(true);
    try {
      await sendTip(recipientId, effectiveAmount, howlId, message || undefined);
      toast.success(`Tipped ${formatMoney(effectiveAmount)} to @${recipientName}! 🐾`);
      setOpen(false);
      setMessage("");
      setCustomAmount("");
    } catch (e: any) {
      toast.error(e?.message ?? "Tip failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-1 rounded-full p-1.5 text-xs text-muted-foreground transition-colors hover:text-amber-400",
          className,
        )}
        title={`Tip @${recipientName}`}
      >
        <Heart className="h-3.5 w-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-card max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Send a Wolf Tip 🐾</DialogTitle>
            <DialogDescription>Support @{recipientName} with a tip</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <Label className="mb-2 block text-xs text-muted-foreground">Choose amount</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_AMOUNTS.map((a) => (
                  <button
                    key={a}
                    onClick={() => { setAmount(a); setCustomAmount(""); }}
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                      amount === a && !customAmount
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    {formatMoney(a)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="custom-tip" className="mb-1 block text-xs text-muted-foreground">Or enter custom amount (USD)</Label>
              <Input
                id="custom-tip"
                type="number"
                min="0.50"
                step="0.50"
                placeholder="e.g. 2.50"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="bg-card"
              />
            </div>

            <div>
              <Label htmlFor="tip-message" className="mb-1 block text-xs text-muted-foreground">Message (optional)</Label>
              <Textarea
                id="tip-message"
                placeholder="Leave a howl of appreciation..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                maxLength={200}
                className="resize-none bg-card"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-sm text-muted-foreground">
                Total: <span className="font-bold text-amber-400">{formatMoney(effectiveAmount < 50 ? 0 : effectiveAmount)}</span>
              </span>
              <Button
                onClick={handleSend}
                disabled={loading || effectiveAmount < 50}
                className="btn-gold rounded-full px-6"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Tip 🐾"}
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Payment gateway integration required for live transactions.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
