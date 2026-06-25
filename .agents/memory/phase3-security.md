---
name: AuraHowls Phase 3 Security
description: Security & Auth additions built in Phase 3 — DB tables, RPCs, routes, rate limits, and privacy controls.
---

## DB Tables Added (migration 20260625073149_phase3_security.sql)
- `user_privacy_settings` — per-user privacy flags (is_private, hide_online_status, disable_dms, restrict_mentions, restrict_comments)
- `security_events` — audit log for login, logout, password_change, session_revoked_all, etc.

## RPCs Added
- `upsert_privacy_settings(...)` — upserts all privacy settings atomically
- `check_duplicate_howl(_content)` — returns true if same content posted in last 10 min
- `log_security_event(_event_type, _user_agent, _device_hint, _metadata)` — inserts security event for current user

## Existing RPC reused
- `check_rate_limit(_action, _max, _window_seconds)` — used for howl (5/300s), echo (15/300s), dm (30/300s)

## New Routes
- `/forgot-password` — email input → calls resetPasswordForEmail(redirectTo=/reset-password)
- `/reset-password` — detects PASSWORD_RECOVERY auth event, shows password form + strength meter
- `/verify-email` — shows verification CTA + resend button; redirects away if already verified
- `/settings/security` — tabs: Password (change + email verify status), Sessions (logout all), Activity Log

## Privacy Controls
- `src/lib/privacy.ts` — fetchPrivacySettings / savePrivacySettings
- `/settings/privacy` — now has Privacy tab (private account, hide online, disable DMs, restrict mentions/comments) + Blocked/Muted/Warnings tabs

## Security Lib (src/lib/security.ts)
- File validation: validateImageFile (10MB, png/jpg/webp/gif), validateVideoFile (100MB, mp4/mov/webm), validateHowlFiles (max 4 images OR 1 video)
- sanitizeText / sanitizeHowlContent — strips HTML tags, js: URIs
- checkPasswordStrength — score 0-6, returns strength label + improvement hints
- recordSecurityEvent — non-blocking, fires-and-forgets to DB

## Anti-spam integrated into
- howls.ts createHowl: rate limit + duplicate check + file validation + sanitize
- howls.ts createEcho: rate limit + 500-char cap
- messages.ts sendMessage: rate limit + file validation + 2000-char content cap

## Email Verification Banner
- EmailVerificationBanner component shown in AppShell when user.email_confirmed_at is null
- Has "Resend" quick action + dismissible

**Why:** Phase 3 requirements demanded server-enforced rate limiting (existing check_rate_limit RPC), client-side file validation before uploads, and privacy as a separate DB table (not profile columns) for cleaner separation.
