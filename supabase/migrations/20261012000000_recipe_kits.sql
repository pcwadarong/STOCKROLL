-- Kits: a named arrangement of recipes over the camera's slots (C1–C7 and the FS1–FS3 dial
-- positions), kept so a set can be planned and reused. A kit is a plan in the app only: nothing
-- here is written to a camera.
--
-- `slots` maps a slot name to what it holds: a recipe id in C1–C7, a film simulation name in
-- FS1–FS3 (the dial stores a simulation, not a recipe), e.g.
-- {"C1": "<uuid>", "FS2": "Classic Chrome"}. It is jsonb
-- rather than a row per slot because a kit is always read and saved whole, and which slots exist
-- is decided by the app (entities/recipe/model/kit.ts), as with `recipes.system`.
-- The price is no foreign key: deleting a recipe leaves its id behind in a kit. The app reads a
-- slot whose recipe is gone as empty (`liveSlots`) and drops it on the next save.
create table public.recipe_kits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  slots jsonb not null default '{}'::jsonb check (jsonb_typeof(slots) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recipe_kits_user_id_idx on public.recipe_kits (user_id);

alter table public.recipe_kits enable row level security;

-- Same rule as every other table: the owner's rows only, for every operation.
create policy recipe_kits_owner on public.recipe_kits
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create trigger set_updated_at before update on public.recipe_kits
  for each row execute function public.set_updated_at();
