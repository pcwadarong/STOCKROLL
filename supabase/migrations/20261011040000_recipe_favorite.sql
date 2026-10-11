-- A star the owner can put on any recipe. Kept separate from `state`: a favorite can be in the
-- camera, a candidate, or archived, so it is its own column rather than another state value.
-- `if not exists`: the column may already be there when the statement was run by hand before
-- the migration was recorded, and the deploy must then pass and record it instead of failing.
alter table public.recipes add column if not exists is_favorite boolean not null default false;
