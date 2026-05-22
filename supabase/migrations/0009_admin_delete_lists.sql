-- Admin can delete any list (and bookmark).
-- Keeps user's own-delete policy intact; this is additive.

create policy "admin deletes any list" on public.lists
  for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

create policy "admin deletes any bookmark" on public.list_bookmarks
  for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );
