-- Sinefil — ban state on profiles
-- Banned users are blocked at middleware and signed out.

alter table public.profiles
  add column is_banned boolean not null default false;
