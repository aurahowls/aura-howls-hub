## AuraHowls-Hub: Next Wave of Features

This is a large body of work spanning 9 feature areas. I'll deliver it in sequenced batches so each piece is reviewable and nothing breaks existing functionality (auth, Howls, Pack, DMs, Alerts, feed, responsiveness).

### Batch 1 — Database foundation (one migration)

New tables / columns to support every feature below:

- `bookmarks(user_id, howl_id)` — save Howls
- `hashtags(tag, howl_count, last_used_at)` + `howl_hashtags(howl_id, tag)` — extracted via trigger from `howls.content`
- `polls(howl_id, expires_at, multi=false)` + `poll_options(id, poll_id, idx, text, vote_count)` + `poll_votes(poll_id, option_id, user_id)` with one-vote-per-user constraint
- `verification_requests(user_id, status, reason, reviewed_by, reviewed_at)` + `profiles.is_verified bool` + `app_role` enum (`admin`, `user`) + `user_roles` table + `has_role()` security-definer fn (per platform rules — roles never on profiles)
- `recent_searches(user_id, query, kind, created_at)` — last 10 per user
- `howls.is_reel bool` (computed: single video, no text-only) for the Reels feed shortcut, plus `howls.saved_count` counter
- Triggers to: extract `#hashtags` on howl insert/update, bump hashtag counts, bump `saved_count`, notify on mention (already exists — extend), enforce one poll vote per user

All tables get the standard 4-step pattern (CREATE → GRANT → ENABLE RLS → POLICY). RLS scopes everything to `auth.uid()` except public reads for hashtags/polls/verification badge.

### Batch 2 — Search overhaul

- `src/lib/search.ts`: `searchAll(q)` returning `{users, howls, videos, hashtags}` using `ilike` on profiles, howls, and `howl_hashtags`. Debounced suggestions hook.
- Rewrite `/search` route into tabbed results (Users / Howls / Videos / Hashtags) with mobile-friendly sticky search bar.
- Recent searches stored in `recent_searches`; trending searches derived from top hashtags last 7 days.

### Batch 3 — Trending

- `src/lib/trending.ts`: score = `howl_count*3 + echo_count*2 + rehowl_count*2 + view_count*0.05` with 48-hour decay. Separate queries for trending Howls / videos / hashtags / users (by recent follower growth).
- New `/trending` route with sections.
- "Top 10 Trending" sidebar widget on Home.

### Batch 4 — Profiles upgrade

- Add **Rehowls** tab to `profile.index.tsx` (Howls / Media / Likes / Rehowls).
- Polished header with banner overlay gradient, verified badge inline, stats row linking to `/pack`.
- Edit Profile (already exists) — verify banner/bio/location/website/join-date all wired; add display of join date in header.

### Batch 5 — Wolf Reels

- `/reels` route: vertical snap-scroll feed of video-only Howls.
- IntersectionObserver autoplay/pause, tap-to-mute, 🐺 like, echo, follow, share, save buttons overlayed.
- Mobile-first full-viewport layout; desktop centers a phone-shaped column.

### Batch 6 — Creator Analytics

- `/analytics` (current user only): follower-growth line chart (recharts), totals (views, video views, engagement rate), top 5 Howls + top 5 videos tables, trending-status badges when in trending list.
- Aggregation done client-side from existing `howls` + `follows` rows (no new schema beyond follower history snapshot — derive from `created_at` of follow rows).

### Batch 7 — Bookmarks

- Bookmark button on every `HowlCard`.
- `/bookmarks` route lists saved Howls.

### Batch 8 — Hashtags and mentions

- Linkify Howl content: render `#tag` → `/hashtag/$tag`, `@user` → `/u/$username`.
- New `/hashtag/$tag` route showing recent Howls for tag.
- Composer suggestions: as user types `#` or `@`, dropdown of matching tags/users.
- Mention notifications already trigger via existing `notify_mentions` — verified.

### Batch 9 — Polls

- Composer "Add poll" toggle: 2–4 options + optional expiry.
- Render polls inside `HowlCard` with vote buttons, live percentages, result view after vote/expiry.

### Batch 10 — Verification + Red Wolf Badge

- `<VerifiedBadge>` component: red wolf-head SVG, deep red (#DC2626), subtle glow shadow.
- Show next to username in: feed, profile, search, comments, messages, notifications.
- `/settings/verification` request form. `/admin/verification` (gated by `has_role('admin')`) to approve/reject.
- Search results gain "Verified only" toggle.

### Technical details (for reference)

- All new server access goes through `requireSupabaseAuth` server functions where user context matters; public reads (hashtag pages, trending) use server publishable client with `TO anon` SELECT policies.
- Realtime enabled on `polls`, `poll_votes`, `bookmarks` so counts update live.
- No breaking changes to existing tables — all additions are additive columns or new tables.
- Mobile-responsive: every new page uses the existing `AppShell` and the grid/min-w-0/shrink-0 pattern.
- Render + Cloudinary compatibility preserved: media still goes through Supabase Storage signed URLs (the existing pattern); no infra change.

### Sequencing

I'll start with **Batch 1 (the schema migration)** in the next turn, since every later batch depends on it. After it's approved I'll ship batches 2–10 across follow-up turns, grouping closely-related ones together (Search+Trending, Profiles+Reels, Analytics+Bookmarks, Hashtags+Polls, Verification last so the badge component lands once and is reused everywhere).

Reply "go" to approve the schema and start.