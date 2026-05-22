-- Sinefil — admin flag + admin delete policy for reviews
-- Set is_admin true via direct DB edit (no UI to grant).

alter table public.profiles
  add column is_admin boolean not null default false;

create policy "admin deletes any review" on public.reviews
  for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );
