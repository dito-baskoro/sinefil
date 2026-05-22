-- Sinefil — review reactions + comments
-- Reactions: fixed enum-like text values; a user can stack multiple distinct reactions on a review.
-- Comments: flat (no threads) text comments tied to a review.

create table public.review_reactions (
  review_id  uuid not null references public.reviews(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null check (kind in ('ngakak', 'relatable', 'ngadi_ngadi', 'gas', 'bosen')),
  created_at timestamptz not null default now(),
  primary key (review_id, user_id, kind)
);

create index review_reactions_review_idx on public.review_reactions (review_id, kind);

alter table public.review_reactions enable row level security;

create policy "review reactions are public" on public.review_reactions
  for select using (true);

create policy "user inserts own reaction" on public.review_reactions
  for insert with check (auth.uid() = user_id);

create policy "user deletes own reaction" on public.review_reactions
  for delete using (auth.uid() = user_id);

create table public.review_comments (
  id          uuid primary key default gen_random_uuid(),
  review_id   uuid not null references public.reviews(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index review_comments_review_idx on public.review_comments (review_id, created_at);
create index review_comments_user_idx on public.review_comments (user_id, created_at desc);

alter table public.review_comments enable row level security;

create policy "review comments are public" on public.review_comments
  for select using (true);

create policy "user inserts own comment" on public.review_comments
  for insert with check (auth.uid() = user_id);

create policy "user updates own comment" on public.review_comments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user deletes own comment" on public.review_comments
  for delete using (auth.uid() = user_id);

create trigger review_comments_touch_updated_at
  before update on public.review_comments
  for each row execute function public.touch_updated_at();
