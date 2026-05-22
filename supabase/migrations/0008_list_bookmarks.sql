-- Sinefil — list bookmarks (saved lists)
-- Lets users save other people's lists so they can revisit them later.
-- Bookmarks are publicly visible on the bookmarker's profile.

create table public.list_bookmarks (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  list_id     uuid not null references public.lists(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, list_id)
);

create index list_bookmarks_user_idx on public.list_bookmarks (user_id, created_at desc);
create index list_bookmarks_list_idx on public.list_bookmarks (list_id);

alter table public.list_bookmarks enable row level security;

create policy "list bookmarks are public" on public.list_bookmarks
  for select using (true);

create policy "user inserts own bookmark" on public.list_bookmarks
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.lists l
      where l.id = list_id
        and (l.is_public or l.user_id = auth.uid())
        and l.user_id <> auth.uid()
    )
  );

create policy "user deletes own bookmark" on public.list_bookmarks
  for delete using (auth.uid() = user_id);
