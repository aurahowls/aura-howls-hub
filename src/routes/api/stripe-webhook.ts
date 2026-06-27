import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const Route = createFileRoute("/api/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!STRIPE_SECRET || !STRIPE_WEBHOOK_SECRET) {
          return Response.json({ error: "Stripe not configured" }, { status: 503 });
        }

        const rawBody = await request.text();
        const signature = request.headers.get("stripe-signature") ?? "";

        let event: Stripe.Event;
        try {
          const stripe = new Stripe(STRIPE_SECRET, { apiVersion: "2025-05-28.basil" });
          event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
        } catch (err: any) {
          console.error("Stripe webhook signature verification failed:", err.message);
          return Response.json({ error: "Invalid signature" }, { status: 400 });
        }

        if (event.type === "checkout.session.completed") {
          const session = event.data.object as Stripe.Checkout.Session;
          const meta = session.metadata ?? {};

          if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
            console.error("Supabase service role not configured — cannot update subscription");
            return Response.json({ received: true });
          }

          const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
            auth: { autoRefreshToken: false, persistSession: false },
          });

          if (meta.type === "wolf_plus") {
            const userId = meta.user_id;
            const plan = meta.plan as "monthly" | "annual";
            const months = plan === "annual" ? 12 : 1;
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + months);

            const { error } = await admin.from("wolf_plus_subscriptions").upsert(
              {
                user_id: userId,
                status: "active",
                tier: plan,
                stripe_subscription_id: session.subscription as string | null,
                stripe_customer_id: session.customer as string | null,
                expires_at: expiresAt.toISOString(),
                started_at: new Date().toISOString(),
              },
              { onConflict: "user_id" },
            );

            if (error) {
              console.error("Failed to activate Wolf+:", error);
              return Response.json({ error: "DB update failed" }, { status: 500 });
            }

            // Also set wolf_plus_active on profile
            await admin
              .from("profiles")
              .update({ wolf_plus_active: true })
              .eq("id", userId);

            console.log(`Wolf+ activated for user ${userId} (${plan})`);
          }

          if (meta.type === "tip") {
            const { recipient_id, amount_cents, howl_id, message, user_id } = meta;
            const { error } = await admin.rpc("send_tip", {
              _recipient_id: recipient_id,
              _amount_usd_cents: parseInt(amount_cents, 10),
              _howl_id: howl_id || null,
              _message: message || null,
            });
            if (error) {
              console.error("Failed to record tip:", error);
            } else {
              console.log(`Tip recorded: ${amount_cents}¢ → ${recipient_id} from ${user_id}`);
            }
          }
        }

        if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
          const sub = event.data.object as Stripe.Subscription;
          if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) return Response.json({ received: true });

          const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
            auth: { autoRefreshToken: false, persistSession: false },
          });

          const status = sub.status === "active" ? "active" : "cancelled";
          await admin
            .from("wolf_plus_subscriptions")
            .update({ status })
            .eq("stripe_subscription_id", sub.id);

          if (status === "cancelled") {
            // Find user and turn off wolf_plus_active
            const { data: row } = await admin
              .from("wolf_plus_subscriptions")
              .select("user_id")
              .eq("stripe_subscription_id", sub.id)
              .maybeSingle();
            if (row?.user_id) {
              await admin.from("profiles").update({ wolf_plus_active: false }).eq("id", row.user_id);
            }
          }
        }

        return Response.json({ received: true });
      },
    },
  },
});
