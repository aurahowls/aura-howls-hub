import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Join the Pack — AuraHowls" },
      { name: "description", content: "Create your AuraHowls den and find your pack." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  return (
    <AuthShell
      title="Forge your den."
      subtitle="Pick your howl name and join the wild side."
      footer={
        <>
          Already running with a pack?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ to: "/home" });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <Input id="name" placeholder="Luna Nightshade" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="handle">Howl name</Label>
          <Input id="handle" placeholder="@luna" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="wolf@aurahowls.dev" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="••••••••" required />
        </div>
        <Button type="submit" className="btn-gold h-12 w-full rounded-full text-base">
          Awaken my Aura
        </Button>
      </form>
    </AuthShell>
  );
}