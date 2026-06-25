---
name: AuraHowls Phase 4-5 Monetization & Launch
description: Creator economy DB schema, monetization lib, new routes, invite system, and launch checklist built in Phase 4 & 5.
---

## DB Tables Added (migration 20260625074146_phase4_monetization.sql)
- `wolf_plus_subscriptions` — Wolf+ premium subscriptions per user
- `creator_plans` — creator monthly subscription pricing/description
- `creator_subscriptions` — subscriber→creator many-to-many
- `tips` — tip transactions (tipper, recipient, optional howl_id, amount_usd_cents)
- `tips_leaderboard` — VIEW aggregating tips per recipient
- `promoted_howls` — promotion campaigns with budget, impressions, clicks, status
- `ad_slots` — named ad slot registry (native, banner, sidebar)
- `invite_codes` / `invite_uses` — beta invite system

## Profile Columns Added
- `account_type` (user/creator/business), `creator_price_usd_cents`
- `business_website`, `business_email`, `business_phone`
- `wolf_plus_active` (boolean), `total_tips_received_cents`

## Howls Column Added
- `is_subscriber_only` (boolean) — gate content behind creator subscription

## RPCs Added
- `upsert_creator_plan(price, description, is_active)` — upserts creator subscription plan
- `send_tip(recipient_id, amount_cents, howl_id?, message?)` — inserts tip + updates profile total
- `update_account_settings(account_type, website, email, phone)` — updates business/creator fields
- `promote_howl(howl_id, budget_cents, days)` — creates promotion campaign
- `generate_invite_code(max_uses, notes, expires_days)` — admin-only invite code generator
- `get_platform_stats()` — mod/admin aggregate stats (users, tips, Wolf+, creators, etc.)
- `get_creator_dashboard()` — per-creator earnings/subscriber/content stats

## New Routes
- `/premium` — Wolf+ subscription page with plan comparison
- `/creator-dashboard` — earnings, subscribers, tips, promotions, content metrics
- `/settings/creator` — account type selector, creator plan, business info (3 tabs)
- `/tips` — Wolf Tips leaderboard (top-tipped creators with podium)
- `/admin/launch` — launch readiness checklist + platform stats + invite code manager

## New Components
- `WolfPlusBadge`, `BusinessBadge`, `CreatorBadge` — account type indicator badges
- `TipButton` — heart button that opens a tip modal (preset + custom amounts)
- `PromoteHowlDialog` — modal to submit howl promotion (budget + duration)
- `AdSlot` — placeholder component for future ad slot rendering

## Updated Files
- `HowlCard.tsx` — sponsored label, subscriber-only badge, TipButton, Promote in dropdown
- `AppShell.tsx` — added Creator Hub, Wolf Tips, Wolf+ to nav
- `settings.tsx` — added "Creator & Business" link
- `admin.tsx` — added "Launch Checklist →" link

## Phase 5 SEO/Launch
- `public/robots.txt` — disallows admin/settings/messages/notifications from crawlers
- Performance indexes added to tips, promotions, creator_subscriptions, profiles.account_type

**Why:** No real payment gateway on free tier — all monetization is DB-ready but shows "Payment gateway coming soon" messaging. Revenue flows (Wolf+, creator subscriptions, tips) need Stripe or equivalent before launch. Tips leaderboard uses a Postgres VIEW for efficient aggregation.
