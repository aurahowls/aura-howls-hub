import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Moon, Users, Zap, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AuraHowls — The Social Den for the Modern Pack" },
      { name: "description", content: "AuraHowls is a wolf-themed social network. Share Howls, grow your Pack, and chase the Aurora." },
      { property: "og:title", content: "AuraHowls" },
      { property: "og:description", content: "Howl. Echo. Belong." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* glow orbs */}
      <div className="pointer-events-none absolute -top-40 -left-32 h-[500px] w-[500px] rounded-full bg-secondary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-[500px] w-[500px] rounded-full bg-primary/20 blur-3xl" />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <Logo size={44} />
          <span className="font-display text-xl font-bold text-gradient-gold">AuraHowls</span>
        </div>
        <nav className="flex items-center gap-2">
          <Link to="/auth">
            <Button variant="ghost" className="rounded-full">Sign in</Button>
          </Link>
          <Link to="/auth">
            <Button className="btn-gold rounded-full px-6">Join the Pack</Button>
          </Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-28">
        <div className="space-y-6 animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
            <Moon className="h-3.5 w-3.5 text-primary" /> A social den for the night-howlers
          </span>
          <h1 className="font-display text-5xl font-black leading-[1.05] tracking-tight md:text-7xl">
            Howl into the <span className="text-gradient-gold">aurora.</span>
            <br />
            Find your <span className="text-gradient-aura">pack.</span>
          </h1>
          <p className="max-w-lg text-lg text-muted-foreground">
            AuraHowls is the social network for lone wolves and tight packs alike.
            Share a Howl, send an Echo, and feel the moonlight on your timeline.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/auth">
              <Button className="btn-gold h-12 rounded-full px-8 text-base">Create your Den</Button>
            </Link>
            <Link to="/home">
              <Button variant="outline" className="h-12 rounded-full border-border bg-card/40 px-8 text-base backdrop-blur hover:bg-card">
                Explore the Pack
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative animate-aura-float">
          <div className="absolute inset-0 -z-10 rounded-full bg-primary/20 blur-3xl" />
          <Logo size={420} className="mx-auto" />
        </div>
      </section>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-4 px-6 pb-24 md:grid-cols-3">
        {[
          { icon: Users, title: "Your Pack", text: "Build a circle that runs at your pace. Pack Members, not followers." },
          { icon: Zap, title: "Live Howls", text: "Real-time timeline with Echoes, Rehowls, and Wolf Alerts." },
          { icon: MessageSquare, title: "Pack DMs", text: "Private dens for late-night strategy and trail intel." },
        ].map((f) => (
          <div key={f.title} className="glass-card rounded-3xl p-6 transition hover:-translate-y-1 hover:aura-glow">
            <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-primary/15 text-primary">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="mb-1 font-display text-xl font-bold">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>

      <footer className="relative z-10 border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        © 2026 AuraHowls. Run wild. Run together.
      </footer>
    </div>
  );
}
