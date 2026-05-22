-- Add 'dislike' (thumbs down) to review_reactions.kind allowed values.

alter table public.review_reactions
  drop constraint review_reactions_kind_check;

alter table public.review_reactions
  add constraint review_reactions_kind_check
  check (kind in ('ngakak', 'relatable', 'ngadi_ngadi', 'gas', 'bosen', 'dislike'));
