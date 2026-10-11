-- Camera systems are defined by the app (entities/recipe/model/systems.ts) and grow over time,
-- so the database no longer restricts `system` to a fixed list. A check constraint here would
-- need a migration for every camera family added.
alter table public.recipes drop constraint if exists recipes_system_check;
