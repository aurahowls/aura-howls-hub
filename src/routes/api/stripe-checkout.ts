import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const STRIPE_PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY;
const STRIPE_PRICE_ANNUAL = process.env.STRIPE_PRICE_ANNUAL;
const APP_URL = process.env.APP_URL ?? "https://aurahowlshub.com";

export const Route = createFileRoute("/api/stripe-checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!STRIPE_SECRET) {
          return Response.json(
            { error: "Payment gateway not configured. Wolf+ subscriptions launch soon!" },
            { status: 503 },
          );
        }

        let body: Record<string, unknown>;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid request body" }, { status: 400 });
        }

        const stripe = new Stripe(STRIPE_SECRET, { apiVersion: "2025-05-28.basil" });
        const type = body.type as string;

        try {
          if (type === "wolf_plus") {
            const plan = body.plan as "monthly" | "annual";
            const userId = body.user_id as string;

            if (!plan || !userId) {
              return Response.json({ error: "Missing plan or user_id" }, { status: 400 });
            }

            const priceId = plan === "annual" ? STRIPE_PRICE_ANNUAL : STRIPE_PRICE_MONTHLY;

            if (!priceId) {
              // Fall back to price_data if no price ID configured
              const priceData =
                plan === "annual"
                  ? { currency: "usd", unit_amount: 7999, recurring: { interval: "year" as const } }
                  : { currency: "usd", unit_amount: 999, recurring: { interval: "month" as const } };

              const session = await stripe.checkout.sessions.create({
                mode: "subscription",
                line_items: [
                  {
                    price_data: {
                      ...priceData,
                      product_data: { name: "Wolf+ Premium", description: "Exclusive Wolf+ badge, themes, analytics, and priority support." },
                    },
                    quantity: 1,
                  },
                ],
                metadata: { type: "wolf_plus", plan, user_id: userId },
                success_url: `${APP_URL}/premium?success=1`,
                cancel_url: `${APP_URL}/premium?cancelled=1`,
                allow_promotion_codes: true,
              });
              return Response.json({ url: session.url });
            }

            const session = await stripe.checkout.sessions.create({
              mode: "subscription",
              line_items: [{ price: priceId, quantity: 1 }],
              metadata: { type: "wolf_plus", plan, user_id: userId },
              success_url: `${APP_URL}/premium?success=1`,
              cancel_url: `${APP_URL}/premium?cancelled=1`,
              allow_promotion_codes: true,
            });
            return Response.json({ url: session.url });
          }

          if (type === "tip") {
            const { recipient_id, recipient_name, amount_cents, howl_id, message, user_id } = body as {
              recipient_id: string;
              recipient_name: string;
              amount_cents: number;
              howl_id?: string;
              message?: string;
              user_id: string;
            };

            if (!recipient_id || !amount_cents || !user_id) {
              return Response.json({ error: "Missing required tip fields" }, { status: 400 });
            }

            const session = await stripe.checkout.sessions.create({
              mode: "payment",
              line_items: [
                {
                  price_data: {
                    currency: "usd",
                    unit_amount: Math.round(amount_cents),
                    product_data: {
                      name: `Wolf Tip to @${recipient_name}`,
                      description: message ? `"${message.slice(0, 100)}"` : "Support your favourite creator",
                    },
                  },
                  quantity: 1,
                },
              ],
              metadata: {
                type: "tip",
                recipient_id,
                recipient_name,
                amount_cents: String(amount_cents),
                howl_id: howl_id ?? "",
                message: (message ?? "").slice(0, 500),
                user_id,
              },
              success_url: `${APP_URL}/tips?success=1`,
              cancel_url: `${APP_URL}/home`,
            });
            return Response.json({ url: session.url });
          }

          return Response.json({ error: "Unknown checkout type" }, { status: 400 });
        } catch (err: any) {
          console.error("Stripe checkout error:", err);
          return Response.json({ error: err?.message ?? "Stripe error" }, { status: 500 });
        }
      },
    },
  },
});
