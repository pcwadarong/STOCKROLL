-- A star the owner can put on any recipe. Kept separate from `state`: a favorite can be in the
-- camera, a candidate, or archived, so it is its own column rather than another state value.
alter table public.recipes add column is_favorite boolean not null default false;
