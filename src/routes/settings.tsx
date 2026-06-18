import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { currentWolf } from "@/lib/mock-data";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — AuraHowls" },
      { name: "description", content: "Tune your den, alerts, and aura." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <AppShell rightRail={false}>
      <h1 className="mb-6 font-display text-3xl font-bold">Settings</h1>

      <div className="space-y-6">
        <section className="glass-card rounded-3xl p-6">
          <h2 className="mb-4 font-display text-xl font-bold">Profile</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Display name</Label>
              <Input defaultValue={currentWolf.name} />
            </div>
            <div className="space-y-2">
              <Label>Howl name</Label>
              <Input defaultValue={currentWolf.handle} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Bio</Label>
              <Input defaultValue={currentWolf.bio} />
            </div>
          </div>
        </section>

        <section className="glass-card rounded-3xl p-6">
          <h2 className="mb-4 font-display text-xl font-bold">Wolf Alerts</h2>
          {[
            { label: "New Pack Members", desc: "When a wolf joins your pack." },
            { label: "Echoes on your Howls", desc: "Replies and threads under your Howls." },
            { label: "Rehowls", desc: "When a wolf rehowls your Howl." },
            { label: "Pack DMs", desc: "Direct messages from your pack." },
          ].map((s, i) => (
            <div key={s.label} className="flex items-center justify-between border-t border-border py-4 first:border-t-0 first:pt-0">
              <div>
                <p className="font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
              <Switch defaultChecked={i !== 2} />
            </div>
          ))}
        </section>

        <section className="glass-card rounded-3xl p-6">
          <h2 className="mb-4 font-display text-xl font-bold">Aura</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Subtle glow effects</p>
              <p className="text-xs text-muted-foreground">Enables the aura halo around cards and avatars.</p>
            </div>
            <Switch defaultChecked />
          </div>
        </section>

        <div className="flex justify-between">
          <Link to="/">
            <Button variant="outline" className="rounded-full">Log out</Button>
          </Link>
          <Button className="btn-gold rounded-full px-6">Save Changes</Button>
        </div>
      </div>
    </AppShell>
  );
}