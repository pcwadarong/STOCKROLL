-- Recipes are no longer Fujifilm-only. Each recipe belongs to a camera system, and the system
-- decides which settings its versions hold (settings stay free-form jsonb).
-- Existing rows were all written for Fujifilm, hence the default.
alter table public.recipes
  add column system text not null default 'fujifilm'
  check (system in ('fujifilm', 'ricoh', 'iphone', 'other'));
