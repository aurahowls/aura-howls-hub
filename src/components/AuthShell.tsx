import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Logo } from "./Logo";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-secondary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />

      <div className="relative w-full max-w-md animate-fade-up">
        <Link to="/" className="mb-8 flex flex-col items-center gap-3">
          <Logo size={80} className="animate-aura-float" />
          <span className="font-display text-2xl font-bold text-gradient-gold">AuraHowls</span>
        </Link>

        <div className="glass-card rounded-3xl p-8">
          <h1 className="font-display text-3xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6 space-y-4">{children}</div>
          <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
        </div>
      </div>
    </div>
  );
}