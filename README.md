# Sinefil 🇮🇩🍿

**Platform film Indonesia.**

## Apa yang Sinefil bikin beda

- **Aman Ditonton Bareng Keluarga?** — empat slider: Family Safe, Awkward Scene Meter, Ketiduran Probability, Nangis Meter.
- **Vibe tags** — film hujan-hujan, film anak kos, film buat move on, film absurd, film tongkrongan.
- **Spoiler-blur** built in.
- **Cuma film Indonesia** (TMDB `original_language=id`).

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui
- Supabase (Postgres + Auth + Storage)
- TMDB for movie data

## Setup

### 1. Install

```bash
npm install
```

### 2. Configure environment

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx          # secret — server-only
TMDB_API_KEY=xxx                        # get at themoviedb.org/settings/api
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> **The app runs without these.** TMDB falls back to a small mock fixture; auth and review features are hidden when Supabase isn't configured. You'll see a setup banner on the home page.

### 3. Supabase project setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/migrations/0001_init.sql`. This creates all tables, RLS policies, the `handle_new_user()` trigger, the `upsert_review()` RPC, and seeds vibe tags.
3. Create a Storage bucket named `avatars`:
   - **Public bucket:** yes (so avatar URLs work without signed URLs).
4. Enable **Google** as an Auth provider:
   - Supabase Dashboard → Authentication → Providers → Google
   - Get Google OAuth credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
   - Authorized redirect URI: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
5. In **Authentication → URL Configuration**, set Site URL to `http://localhost:3000` (and your deployed URL for prod).

### 4. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Landing — trending films + recent reviews |
| `/movies` | Search / discover |
| `/movies/[tmdbId]` | Detail page — overview, family metrics, vibe tags, reviews |
| `/login` | Google OAuth |
| `/onboarding` | Username + avatar (first sign-in) |
| `/profile/[username]` | User profile — reviews + watchlist counts |
| `/auth/callback` | OAuth callback handler |
| `/auth/sign-out` | POST → sign out |

## Database

Migration in `supabase/migrations/0001_init.sql`. Tables:

- `profiles` — mirrors `auth.users`, public-readable.
- `movies` — TMDB cache, lazy-populated on first view.
- `reviews` — one per (user, movie); rating 0.5–5 in 0.5 steps.
- `watchlist` — `want_to_watch | watched`, unique per (user, movie).
- `family_metrics` — five 1–5 ints per review, all optional.
- `vibe_tags` — seeded dictionary.
- `review_vibe_tags` — junction.

RLS is on for every table. Public reads on profiles/movies/reviews/watchlist/family_metrics/vibe_tags/review_vibe_tags. Writes restricted to row owner.

### `upsert_review` RPC

Atomic write of review + family_metrics + vibe_tags in one transaction. Called from `app/movies/[tmdbId]/actions.ts:submitReview`.

## What's NOT in the MVP

Phase 2 — explicitly cut to ship fast:

- Follow users / social graph
- Activity feed from followed users
- Lists (curated collections)
- Funny reactions on reviews (Relatable, Ngadi-ngadi, etc.)
- Review likes
- Shareable cards / yearly stats
- AI features, streaming integration, watch parties

## Deployment

1. Push to GitHub.
2. Vercel → Import repo. Add the same env vars as `.env.local`.
3. In Supabase, add the deployed origin to Auth allowed redirect URLs.
4. Redeploy.

## Scripts

```bash
npm run dev         # dev server (turbopack)
npm run build       # production build
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
```

---

Built fast, on purpose. Issues → open a PR.
