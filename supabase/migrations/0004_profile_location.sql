-- Sinefil — add optional location to profile
alter table public.profiles
  add column location text check (char_length(location) <= 80);
