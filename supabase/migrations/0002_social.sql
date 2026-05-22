-- Sinefil — Phase 2 social features
-- Tables: follows, profile_favorites, lists, list_items
-- RPC:    set_profile_favorites
-- RLS enabled on every table; public read, owner-only writes (lists also gated by is_public).

-- ============================================================================
-- follows — directional social graph
-- ============================================================================
create table public.follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  followee_id  uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index follows_followee_idx on public.follows (followee_id);
create index follows_follower_idx on public.follows (follower_id);

alter table public.follows enable row level security;

create policy "follows are public" on public.follows
  for select using (true);

create policy "user inserts own follow" on public.follows
  for insert with check (auth.uid() = follower_id);

create policy "user deletes own follow" on public.follows
  for delete using (auth.uid() = follower_id);

-- ============================================================================
-- profile_favorites — top 4 movies pinned to a profile, ordered by position
-- ============================================================================
create table public.profile_favorites (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  movie_id    bigint not null references public.movies(id) on delete cascade,
  position    smallint not null check (position between 1 and 4),
  created_at  timestamptz not null default now(),
  primary key (user_id, position),
  unique (user_id, movie_id)
);

create index profile_favorites_user_idx on public.profile_favorites (user_id, position);

alter table public.profile_favorites enable row level security;

create policy "profile favorites are public" on public.profile_favorites
  for select using (true);

create policy "user writes own favorites" on public.profile_favorites
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- lists — curated movie collections
-- ============================================================================
create table public.lists (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 120),
  description  text check (char_length(description) <= 2000),
  is_public    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index lists_user_idx on public.lists (user_id, created_at desc);
create index lists_public_recent_idx on public.lists (created_at desc) where is_public;

alter table public.lists enable row level security;

create policy "public lists are readable" on public.lists
  for select using (is_public or auth.uid() = user_id);

create policy "user inserts own list" on public.lists
  for insert with check (auth.uid() = user_id);

create policy "user updates own list" on public.lists
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user deletes own list" on public.lists
  for delete using (auth.uid() = user_id);

create trigger lists_touch_updated_at
  before update on public.lists
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- list_items — ordered movies inside a list
-- ============================================================================
create table public.list_items (
  list_id    uuid not null references public.lists(id) on delete cascade,
  movie_id   bigint not null references public.movies(id) on delete cascade,
  position   int not null,
  note       text check (char_length(note) <= 500),
  added_at   timestamptz not null default now(),
  primary key (list_id, movie_id),
  unique (list_id, position) deferrable initially deferred
);

create index list_items_list_idx on public.list_items (list_id, position);

alter table public.list_items enable row level security;

create policy "list items inherit list visibility" on public.list_items
  for select using (
    exists (
      select 1 from public.lists l
      where l.id = list_id and (l.is_public or l.user_id = auth.uid())
    )
  );

create policy "user writes items on own list" on public.list_items
  for all
  using (exists (select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid()))
  with check (exists (select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid()));

-- ============================================================================
-- set_profile_favorites RPC — atomic replace of caller's favorites (max 4)
-- ============================================================================
create or replace function public.set_profile_favorites(p_movie_ids bigint[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_id bigint;
  v_pos smallint := 1;
begin
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  if p_movie_ids is not null and array_length(p_movie_ids, 1) > 4 then
    raise exception 'max 4 favorites';
  end if;

  delete from public.profile_favorites where user_id = v_user_id;

  if p_movie_ids is null or array_length(p_movie_ids, 1) is null then
    return;
  end if;

  foreach v_id in array p_movie_ids loop
    insert into public.profile_favorites (user_id, movie_id, position)
    values (v_user_id, v_id, v_pos)
    on conflict (user_id, movie_id) do nothing;
    v_pos := v_pos + 1;
  end loop;
end;
$$;

grant execute on function public.set_profile_favorites to authenticated;
