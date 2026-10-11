-- STOCKROLL 초기 스키마
--
-- 저장 대상은 장비·필름·레시피·촬영 기록(텍스트)과 외부 링크뿐이다.
-- 사진 파일·썸네일은 어떤 테이블에도, Storage에도 올리지 않는다.
-- 모든 테이블은 본인 행만 읽고 쓸 수 있다(RLS).

-- 보유 형태와 현재 상태를 분리한다. 수리 중·디스플레이용·대여였던 장비도
-- 과거 사진에 연결할 수 있어야 하므로 "안 쓰는 장비"를 지우지 않고 상태만 바꾼다.
create table public.cameras (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,            -- 원문 모델명 (Fujifilm X-T50)
  display_name text,             -- 프레임 출력용 별칭. 없으면 name
  kind text not null check (kind in ('digital', 'film')),
  mount text,
  film_format text check (film_format in ('135', '120')),
  ownership text not null default 'owned' check (ownership in ('owned', 'rented', 'borrowed', 'sold')),
  status text not null default 'active' check (status in ('active', 'inactive', 'repair', 'display')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  display_name text,
  mount text,
  ownership text not null default 'owned' check (ownership in ('owned', 'rented', 'borrowed', 'sold')),
  status text not null default 'active' check (status in ('active', 'inactive', 'repair', 'display')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- usage: 실제로 써 본 필름과 관심·구매 후보를 구분한다. 후보를 사용 완료로 기록하지 않는다.
create table public.films (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  format text not null check (format in ('135', '120')),
  iso integer check (iso > 0),
  kind text not null check (kind in ('color_negative', 'bw', 'slide')),
  usage text not null default 'used' check (usage in ('used', 'planned', 'interested')),
  is_favorite boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 레시피는 이름(라벨)과 수치(버전)를 분리한다.
-- 수치를 모르는 후보는 버전 없이 이름만 등록한다 — 이름만 보고 수치를 만들어 넣지 않는다.
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  base_simulation text,          -- ETERNA, PRO Neg. Std ...
  state text not null default 'candidate' check (state in ('candidate', 'active', 'archived')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 수치를 바꾸면 행을 고치지 않고 새 버전을 추가한다. 과거 촬영 기록이 가리키는 값이 유지된다.
create table public.recipe_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  version integer not null check (version > 0),
  settings jsonb not null,
  source_url text,
  created_at timestamptz not null default now(),
  unique (recipe_id, version)
);

-- 롤 단위로 카메라·필름·현상소를 한 번 입력해 여러 컷에 적용한다.
create table public.rolls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null,
  camera_id uuid references public.cameras (id) on delete set null,
  film_id uuid references public.films (id) on delete set null,
  lab text,
  loaded_on date,
  developed_on date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 촬영 기록. 촬영 당시 시뮬레이션 / 연결한 레시피 / 최종 보정 룩은 서로 다른 사실이라 필드를 나눈다.
-- field_sources: 각 값이 EXIF에서 왔는지 사용자가 입력했는지 ({"camera": "exif", "lens": "manual"}).
create table public.shots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text,
  taken_at timestamptz,
  camera_id uuid references public.cameras (id) on delete set null,
  lens_id uuid references public.lenses (id) on delete set null,
  film_id uuid references public.films (id) on delete set null,
  roll_id uuid references public.rolls (id) on delete set null,
  simulation text,
  recipe_version_id uuid references public.recipe_versions (id) on delete set null,
  final_look text,
  exposure jsonb,                -- iso, focalLength, focalLength35, aperture, exposureTime. 모르는 값은 키를 넣지 않는다
  field_sources jsonb not null default '{}'::jsonb,
  drive_url text,
  instagram_url text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shots_user_taken_at_idx on public.shots (user_id, taken_at desc);
create index shots_roll_id_idx on public.shots (roll_id);
create index rolls_user_id_idx on public.rolls (user_id);
create index recipe_versions_recipe_id_idx on public.recipe_versions (recipe_id);

create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['cameras', 'lenses', 'films', 'recipes', 'recipe_versions', 'rolls', 'shots'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t || '_owner', t
    );
  end loop;

  foreach t in array array['cameras', 'lenses', 'films', 'recipes', 'rolls', 'shots'] loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t
    );
  end loop;
end;
$$;
