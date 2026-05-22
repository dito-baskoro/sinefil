-- Sinefil — initial schema
-- Tables: profiles, movies, reviews, watchlist, family_metrics, vibe_tags, review_vibe_tags
-- RLS enabled on every table. Inserts/updates restricted to row owner.

-- ============================================================================
-- profiles — mirrors auth.users 1:1 with public-facing fields
-- ============================================================================
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  username        text unique not null,
  display_name    text,
  avatar_url      text,
  bio             text,
  location        text check (char_length(location) <= 80),
  is_admin        boolean not null default false,
  created_at      timestamptz not null default now()
);

create index profiles_username_idx on public.profiles (username);

alter table public.profiles enable row level security;

create policy "profiles are public" on public.profiles
  for select using (true);

create policy "user updates own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-create profile row on user signup with a provisional username
-- (forces onboarding flow on first login).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  fallback_username text;
begin
  fallback_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 8);
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    fallback_username,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- movies — TMDB-sourced cache. Populated lazily.
-- ============================================================================
create table public.movies (
  id              bigserial primary key,
  tmdb_id         int unique not null,
  title           text not null,
  original_title  text,
  overview        text,
  poster_path     text,
  backdrop_path   text,
  release_date    date,
  runtime         int,
  genres          text[] not null default '{}',
  language        text,
  synced_at       timestamptz not null default now()
);

create index movies_release_date_idx on public.movies (release_date desc nulls last);
create index movies_language_idx on public.movies (language);

alter table public.movies enable row level security;

create policy "movies are public" on public.movies
  for select using (true);

-- Inserts/updates only via service role (server actions). No client-side writes.

-- ============================================================================
-- reviews — rating + text + spoiler flag, one per (user, movie)
-- ============================================================================
create table public.reviews (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  movie_id          bigint not null references public.movies(id) on delete cascade,
  rating            numeric(2,1) not null
                    check (rating between 0.5 and 5.0 and (rating * 2) = floor(rating * 2)),
  review_text       text,
  contains_spoiler  boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, movie_id)
);

create index reviews_movie_id_idx on public.reviews (movie_id, created_at desc);
create index reviews_user_id_idx on public.reviews (user_id, created_at desc);

alter table public.reviews enable row level security;

create policy "reviews are public" on public.reviews
  for select using (true);

create policy "user inserts own review" on public.reviews
  for insert with check (auth.uid() = user_id);

create policy "user updates own review" on public.reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user deletes own review" on public.reviews
  for delete using (auth.uid() = user_id);

create policy "admin deletes any review" on public.reviews
  for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger reviews_touch_updated_at
  before update on public.reviews
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- watchlist — want_to_watch | watched
-- ============================================================================
create table public.watchlist (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  movie_id    bigint not null references public.movies(id) on delete cascade,
  status      text not null check (status in ('want_to_watch', 'watched')),
  created_at  timestamptz not null default now(),
  unique (user_id, movie_id)
);

create index watchlist_user_id_idx on public.watchlist (user_id, status);

alter table public.watchlist enable row level security;

create policy "watchlist entries are public" on public.watchlist
  for select using (true);

create policy "user inserts own watchlist" on public.watchlist
  for insert with check (auth.uid() = user_id);

create policy "user updates own watchlist" on public.watchlist
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user deletes own watchlist" on public.watchlist
  for delete using (auth.uid() = user_id);

-- ============================================================================
-- family_metrics — "Aman Ditonton Bareng Keluarga?" per review (all optional)
-- ============================================================================
create table public.family_metrics (
  id                              uuid primary key default gen_random_uuid(),
  review_id                       uuid not null references public.reviews(id) on delete cascade,
  family_safe                     int check (family_safe between 1 and 5),
  awkward_scene_meter             int check (awkward_scene_meter between 1 and 5),
  ketiduran_probability           int check (ketiduran_probability between 1 and 5),
  nangis_meter                    int check (nangis_meter between 1 and 5),
  unique (review_id)
);

alter table public.family_metrics enable row level security;

create policy "family metrics public" on public.family_metrics
  for select using (true);

create policy "user writes family metrics on own review" on public.family_metrics
  for all
  using (exists (select 1 from public.reviews r where r.id = review_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.reviews r where r.id = review_id and r.user_id = auth.uid()));

-- ============================================================================
-- vibe_tags — seeded dictionary, users pick from this list
-- ============================================================================
create table public.vibe_tags (
  id          serial primary key,
  slug        text unique not null,
  label_id    text not null,
  emoji       text
);

alter table public.vibe_tags enable row level security;

create policy "vibe tags public" on public.vibe_tags
  for select using (true);

-- No user writes — admin only via service role.

insert into public.vibe_tags (slug, label_id, emoji) values
  ('film-hujan-hujan',   'Film hujan-hujan',       '🌧️'),
  ('film-anak-kos',      'Film anak kos',          '🍜'),
  ('film-buat-move-on',  'Film buat move on',      '💔'),
  ('film-absurd',        'Film absurd',            '🌀'),
  ('film-tongkrongan',   'Film tongkrongan',       '☕'),
  ('film-rame-rame',     'Film rame-rame',         '👯'),
  ('film-sendirian',     'Film sendirian',         '🪑'),
  ('film-buat-tidur',    'Film buat ketiduran',    '😴');

-- ============================================================================
-- review_vibe_tags — junction
-- ============================================================================
create table public.review_vibe_tags (
  review_id   uuid not null references public.reviews(id) on delete cascade,
  vibe_tag_id int not null references public.vibe_tags(id) on delete cascade,
  primary key (review_id, vibe_tag_id)
);

create index review_vibe_tags_vibe_idx on public.review_vibe_tags (vibe_tag_id);

alter table public.review_vibe_tags enable row level security;

create policy "review vibe tags public" on public.review_vibe_tags
  for select using (true);

create policy "user writes vibe tags on own review" on public.review_vibe_tags
  for all
  using (exists (select 1 from public.reviews r where r.id = review_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.reviews r where r.id = review_id and r.user_id = auth.uid()));

-- ============================================================================
-- avatars storage bucket (run separately in Supabase dashboard or CLI)
-- ============================================================================
-- create storage bucket 'avatars' (public read).
-- See README for setup steps.

-- ============================================================================
-- upsert_review RPC — atomic insert/update of review + family_metrics + vibes
-- ============================================================================
create or replace function public.upsert_review(
  p_movie_id        bigint,
  p_rating          numeric,
  p_review_text     text,
  p_contains_spoiler boolean,
  p_family          jsonb,        -- {"family_safe":3,...} or null
  p_vibe_tag_ids    int[]         -- ids of selected vibe tags, may be empty
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_review_id uuid;
begin
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  insert into public.reviews (user_id, movie_id, rating, review_text, contains_spoiler)
  values (v_user_id, p_movie_id, p_rating, nullif(trim(p_review_text), ''), coalesce(p_contains_spoiler, false))
  on conflict (user_id, movie_id) do update
    set rating = excluded.rating,
        review_text = excluded.review_text,
        contains_spoiler = excluded.contains_spoiler,
        updated_at = now()
  returning id into v_review_id;

  -- Family metrics (delete any prior + insert if provided)
  delete from public.family_metrics where review_id = v_review_id;
  if p_family is not null and p_family <> 'null'::jsonb then
    insert into public.family_metrics (
      review_id, family_safe, awkward_scene_meter, ketiduran_probability, nangis_meter
    ) values (
      v_review_id,
      nullif((p_family->>'family_safe'), '')::int,
      nullif((p_family->>'awkward_scene_meter'), '')::int,
      nullif((p_family->>'ketiduran_probability'), '')::int,
      nullif((p_family->>'nangis_meter'), '')::int
    );
  end if;

  -- Vibe tags (replace set)
  delete from public.review_vibe_tags where review_id = v_review_id;
  if p_vibe_tag_ids is not null and array_length(p_vibe_tag_ids, 1) > 0 then
    insert into public.review_vibe_tags (review_id, vibe_tag_id)
    select v_review_id, vt
    from unnest(p_vibe_tag_ids) as vt
    where exists (select 1 from public.vibe_tags where id = vt);
  end if;

  return v_review_id;
end;
$$;

grant execute on function public.upsert_review to authenticated;
