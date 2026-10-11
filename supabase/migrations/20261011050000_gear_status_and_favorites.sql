-- Gear lists are narrowed and ordered the same way for cameras, lenses, films and recipes.
-- That needs three things from the schema: one status per camera/lens instead of two fields,
-- a favorite star on cameras and lenses (films and recipes already have one), and a body type.

-- 1. Status absorbs ownership. "Rented" and "Sold" answer the same question as "In repair"
--    (can I shoot with it, and if not, why), so they join the status list. Borrowed gear is
--    recorded as rented. The `ownership` column is kept, unread, so nothing recorded is lost.
alter table public.cameras drop constraint cameras_status_check;
alter table public.cameras add constraint cameras_status_check
  check (status in ('active', 'inactive', 'repair', 'display', 'rented', 'sold'));
update public.cameras
  set status = case ownership when 'sold' then 'sold' else 'rented' end
  where ownership <> 'owned';

alter table public.lenses drop constraint lenses_status_check;
alter table public.lenses add constraint lenses_status_check
  check (status in ('active', 'inactive', 'repair', 'display', 'rented', 'sold'));
update public.lenses
  set status = case ownership when 'sold' then 'sold' else 'rented' end
  where ownership <> 'owned';

-- 2. Favorites on cameras and lenses.
alter table public.cameras add column is_favorite boolean not null default false;
alter table public.lenses add column is_favorite boolean not null default false;

-- 3. Camera body type. Empty when unknown: it is never guessed from the model name.
alter table public.cameras add column body_type text
  check (body_type in ('compact', 'slr', 'mirrorless', 'rangefinder', 'tlr', 'instant', 'phone', 'other'));

-- 4. Cine film (motion picture stock) as a film type.
alter table public.films drop constraint films_kind_check;
alter table public.films add constraint films_kind_check
  check (kind in ('color_negative', 'bw', 'slide', 'cine'));
