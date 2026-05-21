
# Indonesian Movie Review Platform MVP
## “Letterboxd for Indonesian Cinema” 🇮🇩🍿
app name: Sinefil

## Product Vision
Build a social platform focused exclusively on Indonesian films and Indonesian movie culture.

### Core Differentiation
- local humor
- contextual reviews
- social identity
- Indonesian-specific discovery
- relatable watch experiences

---

## MVP Features

### Authentication
- Google login
- Username setup
- Avatar upload

### Movie Database
- Indonesian movies only
- TMDB integration
- Search movies
- Movie detail pages

### Reviews
- Star ratings
- Short review text
- Spoiler toggle
- Review likes

### Watchlist
- Save movies
- Watched status

### User Profile
- Favorite films
- Recent reviews
- Lists
- Activity feed

### Social Features
- Follow users
- Homepage feed
- Trending reviews

---

## Indonesian-Specific Features

### Aman Ditonton Bareng Keluarga?
Community metrics:
- Family Safe
- Awkward Scene Meter
- Bapak Ketiduran Probability
- Ibu Bakal Komentar Terus
- Nangis Meter

### Vibe Tags
Examples:
- Film hujan-hujan
- Film anak kos
- Film buat move on
- Film absurd
- Film tongkrongan

### Funny Reactions
- Relatable
- Setuju Banget
- Review Sok Arsty
- Bener Juga
- Ngadi-ngadi

---

## Recommended Tech Stack

### Frontend
- Next.js
- TypeScript
- TailwindCSS
- shadcn/ui

### Backend
- Supabase
- PostgreSQL
- Auth
- Storage
- Realtime

### Hosting
- Vercel
- Supabase

---

## Database Schema

### users
```sql
id
username
avatar_url
bio
created_at
```

### movies
```sql
id
tmdb_id
title
overview
poster_url
release_date
genres
runtime
language
```

### reviews
```sql
id
user_id
movie_id
rating
review_text
contains_spoiler
created_at
```

### watchlists
```sql
id
user_id
movie_id
status
```

---

## TMDB Endpoints

### Search Movies
```bash
/search/movie
```

### Movie Details
```bash
/movie/{id}
```

### Discover Indonesian Movies
```bash
/discover/movie?with_original_language=id
```

---

## UI Pages

### Landing Page
- Trending films
- Trending reviews
- Popular lists

### Movie Detail Page
- Poster
- Synopsis
- Cast
- Ratings
- Reviews
- Family-safe metrics

### User Profile
- Watched films
- Favorite films
- Lists
- Recent activity

### Feed
- Reviews from followed users
- Trending reviews
- New releases

---

## MVP Timeline (cut-scope, 2-3 weeks)

> **Scope decision (May 2026):** dropped lists, follows, activity feed, and funny reactions on reviews to Phase 2. Keep the Indonesian-specific moat (family metrics + vibe tags) and the basics (auth, search, detail, reviews, watchlist).

### Week 1
- ✅ Project scaffold (Next.js 15 + TS + Tailwind + shadcn)
- ✅ Supabase schema + RLS + trigger + seed
- ✅ TMDB wrapper with mock-data fallback (works without API key)
- ✅ Google OAuth + onboarding (username + avatar)

### Week 2
- ✅ Search + movie detail page (lazy upsert into movies cache)
- ✅ Reviews with star rating + spoiler toggle
- ✅ Family metrics sliders + vibe tag picker (Indonesian-specific)
- ✅ Watchlist (want_to_watch / watched)
- ✅ Profile page (avatar, bio, recent reviews, watched count)

### Week 3
- Mobile responsive sweep
- Supabase deploy + Vercel deploy
- Soft launch

---

## Database Schema

Implemented in `supabase/migrations/0001_init.sql`. Tables: `profiles`, `movies`, `reviews`, `watchlist`, `family_metrics`, `vibe_tags`, `review_vibe_tags`. RLS enabled. See `README.md` for the full overview.

---

## Growth Strategy

### Initial Audience
- Indonesian movie Twitter/X
- TikTok film creators
- Horror communities
- Campus film clubs

### Viral Features
- Shareable review cards
- Yearly stats
- Favorite movie collages

---

## Future Features

### AI Features
- Movie summaries
- Recommendation explanations
- Mood matching

### Streaming Integration
- Netflix availability
- Bioskop schedules
- Vidio/Prime/Disney+

### Community Events
- Watch parties
- Film clubs
- Online discussions

---

## Monetization

### Phase 1
No monetization.

### Phase 2
Premium:
- Profile themes
- Advanced stats
- Yearly reports
- Supporter badge

### Phase 3
B2B:
- Indie film promotion
- Screening sponsorship
- Festival partnerships

---

## Biggest Risks

### Low review creation
Solution:
- quick reactions
- funny metrics
- vibe tags

### Empty social graph
Solution:
- curated reviewers
- featured reviews

### TMDB missing Indonesian content
Solution:
- admin curation tools

---

## Final Strategy

Do NOT compete globally.

Win with:
- relatability
- local humor
- Indonesian context
- social identity

The moat:
> Indonesians don’t only watch movies.
> They watch movies socially.
