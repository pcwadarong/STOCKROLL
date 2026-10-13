-- Lists are ordered, searched and cut into steps by the database instead of in the browser, so a
-- list screen asks for the rows it shows and nothing else. Two kinds of generated column make
-- that possible through the REST API, which can order and filter by columns but not by
-- expressions. Nothing a user entered is changed: both are computed from existing columns and
-- kept up to date by Postgres.
--
-- `search_text`: the text a user typed into a record, folded so a search can ignore case, letter
-- width, spaces and dashes ("xt50" finds "X-T50", "16-80" finds "16–80mm"). The app folds each
-- search word the same way (src/shared/lib/search.ts) and asks for `search_text like %word%`.
-- Only free text is in it. Facts picked from a list (type, status, format, system, state) are
-- narrowed with the dropdowns, and their labels live in the app, not here.
--
-- `list_rank`: where a record stands in current use, as a number to order by — gear in use
-- first, then in repair, shelved, on display, rented, sold; recipes in the camera first, then
-- candidates, then archived. The order is the one the lists already showed.

-- Dots and slashes are kept: dropping the dot would let "2.8" find "28mm".
--
-- Every step is spelled out rather than left to `lower()` and `\s`, whose results depend on the
-- database's locale: under the C locale `lower()` leaves "É" alone, and the app would lower it.
-- Only A–Z are lowered and only the listed characters are dropped, so this function and the
-- app's fold give the same text on any server. Accented capitals therefore stay as typed.
create function public.fold_search(value text) returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select regexp_replace(
    translate(normalize(value, NFKC), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'),
    '[ \t\n\r\f\v_\-‐‑‒–—―]+', '', 'g'
  )
$$;

-- '|' keeps one field's end from joining the next field's start into a word.
alter table public.cameras
  add column search_text text generated always as (
    public.fold_search(
      name || '|' || coalesce(display_name, '') || '|' || coalesce(mount, '') || '|' || coalesce(note, '')
    )
  ) stored,
  add column list_rank smallint generated always as (
    case status
      when 'active' then 0
      when 'repair' then 1
      when 'inactive' then 2
      when 'display' then 3
      when 'rented' then 4
      when 'sold' then 5
      else 6
    end
  ) stored;

alter table public.lenses
  add column search_text text generated always as (
    public.fold_search(
      name || '|' || coalesce(display_name, '') || '|' || coalesce(mount, '') || '|' || coalesce(note, '')
    )
  ) stored,
  add column list_rank smallint generated always as (
    case status
      when 'active' then 0
      when 'repair' then 1
      when 'inactive' then 2
      when 'display' then 3
      when 'rented' then 4
      when 'sold' then 5
      else 6
    end
  ) stored;

-- Films have no status: they are ordered by the star alone.
alter table public.films
  add column search_text text generated always as (
    public.fold_search(name || '|' || coalesce(iso::text, '') || '|' || coalesce(note, ''))
  ) stored;

alter table public.recipes
  add column search_text text generated always as (
    public.fold_search(
      name || '|' || coalesce(base_simulation, '') || '|' || coalesce(note, '')
    )
  ) stored,
  add column list_rank smallint generated always as (
    case state
      when 'active' then 0
      when 'candidate' then 1
      when 'archived' then 2
      else 3
    end
  ) stored;

alter table public.recipe_kits
  add column search_text text generated always as (
    public.fold_search(name || '|' || coalesce(note, ''))
  ) stored;
