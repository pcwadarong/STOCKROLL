-- A free-text note on a kit, as cameras, lenses, films and recipes already carry one: what the set
-- is for, where it was used. Nullable with no default, so existing kits simply have none and no
-- row is rewritten.
alter table public.recipe_kits add column note text;
