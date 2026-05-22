-- Add genre-leaning vibe tags: horror, thriller, adult
insert into public.vibe_tags (slug, label_id, emoji) values
  ('film-serem-sereman', 'Film serem-sereman', '👻'),
  ('film-tegang',        'Film tegang',        '🔪'),
  ('film-dewasa',        'Film dewasa',        '🔞')
on conflict (slug) do nothing;
