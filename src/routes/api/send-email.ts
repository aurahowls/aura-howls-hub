import { createFileRoute } from "@tanstack/react-router";
import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM ?? "AuraHowls <noreply@aurahowlshub.com>";

export const Route = createFileRoute("/api/send-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!RESEND_API_KEY) {
          console.warn("RESEND_API_KEY not set — email not sent");
          return Response.json(
            { ok: false, error: "Email provider not configured" },
            { status: 503 },
          );
        }

        let body: { to?: string; subject?: string; html?: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const { to, subject, html } = body;
        if (!to || !subject || !html) {
          return Response.json({ error: "Missing to, subject, or html" }, { status: 400 });
        }

        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
          return Response.json({ error: "Invalid email address" }, { status: 400 });
        }

        try {
          const resend = new Resend(RESEND_API_KEY);
          const { error } = await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
          if (error) {
            console.error("Resend error:", error);
            return Response.json({ ok: false, error: error.message }, { status: 500 });
          }
          return Response.json({ ok: true });
        } catch (err: any) {
          console.error("Email send failed:", err);
          return Response.json({ ok: false, error: err?.message ?? "Unknown error" }, { status: 500 });
        }
      },
    },
  },
});
