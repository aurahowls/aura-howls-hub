---
name: Production Infrastructure
description: Stripe, Resend, Sentry integration patterns and required env vars for AuraHowls.
---

## Stripe
- API routes at `/api/stripe-checkout` (POST) and `/api/stripe-webhook` (POST)
- `src/lib/stripe.ts` — client helpers: `createCheckoutSession`, `createTipCheckoutSession`, `isStripeConfigured`
- `isStripeConfigured` gates the live flow; missing key → shows "coming soon" toast
- Webhook verifies signature then upserts `wolf_plus_subscriptions` and updates `profiles.wolf_plus_active`
- Stripe version pinned: `2025-05-28.basil`

**Why:** Webhook must use raw body (`request.text()`) for signature verification — do not parse JSON first.

## Resend
- API route at `/api/send-email` (POST) — accepts `{ to, subject, html }`
- `src/lib/email.ts` — client helpers: `sendEmail`, `welcomeEmail`, `referralRewardEmail`
- Graceful 503 when `RESEND_API_KEY` is unset

## Sentry
- `src/lib/sentry.ts` — `initSentry()` is a no-op when `VITE_SENTRY_DSN` is unset
- Called at module level in `src/routes/__root.tsx` (before component definitions)
- `beforeSend` returns null in DEV mode to avoid polluting Sentry with local errors

## Required Environment Variables
| Var | Used by |
|-----|---------|
| `STRIPE_SECRET_KEY` | stripe-checkout.ts, stripe-webhook.ts |
| `VITE_STRIPE_PUBLISHABLE_KEY` | stripe.ts (client, gates isStripeConfigured) |
| `STRIPE_WEBHOOK_SECRET` | stripe-webhook.ts signature check |
| `STRIPE_PRICE_MONTHLY` | stripe-checkout.ts (optional, falls back to price_data) |
| `STRIPE_PRICE_ANNUAL` | stripe-checkout.ts (optional) |
| `SUPABASE_SERVICE_ROLE_KEY` | stripe-webhook.ts admin DB updates |
| `RESEND_API_KEY` | send-email.ts |
| `EMAIL_FROM` | send-email.ts (default: AuraHowls noreply) |
| `VITE_SENTRY_DSN` | sentry.ts |
| `APP_URL` | stripe-checkout.ts success/cancel URLs |
