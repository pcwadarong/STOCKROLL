-- A row may only point at rows owned by the same user.
--
-- Row-level security checks that the row being written belongs to the caller, but a plain
-- foreign key on `id` does not check who owns the row it points at. Someone who learned another
-- user's camera id could attach it to their own shot, and tell from the error whether an id
-- exists. Including `user_id` in every reference closes that: the pair (id, user_id) has to match.
--
-- `on delete set null (column)` (PostgreSQL 15+) clears only the reference, never `user_id`.

alter table public.cameras add constraint cameras_id_user_id_key unique (id, user_id);
alter table public.lenses add constraint lenses_id_user_id_key unique (id, user_id);
alter table public.films add constraint films_id_user_id_key unique (id, user_id);
alter table public.recipes add constraint recipes_id_user_id_key unique (id, user_id);
alter table public.recipe_versions
  add constraint recipe_versions_id_user_id_key unique (id, user_id);
alter table public.rolls add constraint rolls_id_user_id_key unique (id, user_id);

alter table public.recipe_versions
  drop constraint if exists recipe_versions_recipe_id_fkey,
  add constraint recipe_versions_recipe_id_fkey
    foreign key (recipe_id, user_id) references public.recipes (id, user_id) on delete cascade;

alter table public.rolls
  drop constraint if exists rolls_camera_id_fkey,
  drop constraint if exists rolls_film_id_fkey,
  add constraint rolls_camera_id_fkey
    foreign key (camera_id, user_id) references public.cameras (id, user_id)
    on delete set null (camera_id),
  add constraint rolls_film_id_fkey
    foreign key (film_id, user_id) references public.films (id, user_id)
    on delete set null (film_id);

alter table public.shots
  drop constraint if exists shots_camera_id_fkey,
  drop constraint if exists shots_lens_id_fkey,
  drop constraint if exists shots_film_id_fkey,
  drop constraint if exists shots_roll_id_fkey,
  drop constraint if exists shots_recipe_version_id_fkey,
  add constraint shots_camera_id_fkey
    foreign key (camera_id, user_id) references public.cameras (id, user_id)
    on delete set null (camera_id),
  add constraint shots_lens_id_fkey
    foreign key (lens_id, user_id) references public.lenses (id, user_id)
    on delete set null (lens_id),
  add constraint shots_film_id_fkey
    foreign key (film_id, user_id) references public.films (id, user_id)
    on delete set null (film_id),
  add constraint shots_roll_id_fkey
    foreign key (roll_id, user_id) references public.rolls (id, user_id)
    on delete set null (roll_id),
  add constraint shots_recipe_version_id_fkey
    foreign key (recipe_version_id, user_id) references public.recipe_versions (id, user_id)
    on delete set null (recipe_version_id);
