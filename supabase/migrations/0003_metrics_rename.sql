-- Sinefil — rename + prune family_metrics columns
--   bapak_ketiduran_probability -> ketiduran_probability
--   ibu_bakal_komentar_terus    -> dropped
-- Also replaces upsert_review RPC so the new shape sticks.

alter table public.family_metrics
  rename column bapak_ketiduran_probability to ketiduran_probability;

alter table public.family_metrics
  drop column ibu_bakal_komentar_terus;

create or replace function public.upsert_review(
  p_movie_id        bigint,
  p_rating          numeric,
  p_review_text     text,
  p_contains_spoiler boolean,
  p_family          jsonb,
  p_vibe_tag_ids    int[]
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
