import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "aurahowls.pwa.dismissed";

/** "Add to Home Screen" banner. Browsers fire `beforeinstallprompt` only when eligible. */
export function PWAInstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(DISMISSED_KEY) === "1";
  });

  useEffect(() => {
    if (hidden) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [hidden]);

  if (hidden || !evt) return null;

  return (
    <div className="fixed inset-x-4 bottom-20 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur md:bottom-4">
      <img src="/icon-192.png" alt="" className="h-10 w-10 rounded-lg" width={40} height={40} />
      <div className="flex-1 text-sm">
        <p className="font-semibold text-foreground">Install AuraHowls</p>
        <p className="text-xs text-muted-foreground">Add to your home screen for a faster app experience.</p>
      </div>
      <Button
        size="sm"
        onClick={async () => {
          await evt.prompt();
          await evt.userChoice;
          setEvt(null);
        }}
      >
        <Download className="h-4 w-4" />
      </Button>
      <button
        onClick={() => {
          localStorage.setItem(DISMISSED_KEY, "1");
          setHidden(true);
        }}
        aria-label="Dismiss"
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}