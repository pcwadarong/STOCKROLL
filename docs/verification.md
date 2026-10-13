# 확인 방법

자동 테스트(`pnpm test`)가 닿지 않는 것을 어떻게 확인하는지 적는다. 규칙은 [AGENTS.md](../AGENTS.md) §4에 있고, 여기는 **실제로 통했던 절차**다. 확인하지 못한 것은 PR의 Test plan에 "미실행"으로 적는다.

| 확인할 것                              | 방법                                     |
| -------------------------------------- | ---------------------------------------- |
| 순수 계산(레이아웃·포맷·필터·정렬)     | `pnpm test` (`TZ=UTC`로 한 번 더)        |
| 로그인해야 보이는 화면(장비·레시피)    | §1 가짜 세션 + 가짜 응답                 |
| 편집기에서 사진 열기·미리보기·내보내기 | §2 샘플 파일을 입력에 넣기               |
| 마이그레이션                           | §3 일회용 Postgres                       |
| PR 하나만 따로 검사                    | §4 `git archive`                         |
| iOS Safari·설치한 PWA·실제 다운로드    | 자동화로 볼 수 없다. 사용자에게 부탁한다 |

## 1. 로그인 화면을 로그인 없이 보기

Google 로그인은 자동화 브라우저에서 통과할 수 없다. 대신 브라우저에 **가짜 세션**을 넣고 Supabase REST 호출을 **가짜 응답**으로 바꿔 화면 흐름만 본다. 실제 프로젝트에는 아무것도 쓰지 않는다.

`pnpm dev`로 띄운 탭에서 한 번에 실행한다. 새로고침하면 `fetch` 패치가 사라지므로, 페이지 이동은 `pushState`로 한다.

```js
const user = {
  id: '00000000-0000-4000-8000-000000000001',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-01-01T00:00:00Z',
};
const b64 = o => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const exp = Math.floor(Date.now() / 1000) + 36000;

// 1) 세션: 키 이름은 sb-<프로젝트 ref>-auth-token
localStorage.setItem(
  'sb-bljlhtyseulsapghvdzm-auth-token',
  JSON.stringify({
    access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: user.id, exp, role: 'authenticated' })}.sig`,
    refresh_token: 'r',
    token_type: 'bearer',
    expires_in: 36000,
    expires_at: exp,
    user,
  }),
);

// 2) 응답: 테이블 이름 → 행 배열. 컬럼은 DB 그대로 snake_case
const rows = {
  cameras: [
    {
      id: 'c1',
      name: 'Fujifilm X-T50',
      kind: 'digital',
      body_type: 'mirrorless',
      mount: 'X',
      status: 'active',
      is_favorite: true,
    },
    {
      id: 'c2',
      name: 'Olympus mju II',
      kind: 'film',
      body_type: 'compact',
      film_format: '135',
      status: 'repair',
      is_favorite: false,
    },
  ],
};
const real = window.fetch;
const json = body =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
window.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input.url;
  const table = url.match(/\/rest\/v1\/(\w+)/)?.[1];
  if (table) {
    // 저장(.update().select().single())은 배열이 아니라 행 하나를 돌려줘야 한다
    if ((init?.method ?? 'GET').toUpperCase() === 'PATCH') {
      const row = rows[table].find(r => r.id === url.match(/id=eq\.([\w-]+)/)[1]);
      Object.assign(row, JSON.parse(init.body));
      return json(row);
    }
    return json(rows[table] ?? []);
  }
  if (url.includes('/auth/v1/user')) return json(user);
  return real(input, init);
};

// 3) 이동: 새로고침 없이
history.pushState({}, '', '/library/cameras');
window.dispatchEvent(new PopStateEvent('popstate'));
```

그다음 DOM을 읽어 확인한다(행의 글자, `aria-pressed`, `getBoundingClientRect()`로 위치·크기).

> **이 방법으로 알 수 없는 것**: RLS 정책, 실제 저장·삭제, Storage 업로드, 기존 데이터가 어떻게 보이는지. "화면 흐름을 가짜 데이터로 확인했다"까지만 말할 수 있다.

### 자동화 브라우저의 함정

| 증상                                        | 원인                                                             | 대신                                                                   |
| ------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 스크린샷이 시간 초과되거나 "not painted"    | 백그라운드 탭은 화면을 그리지 않는다                             | 새 탭을 열어 다시 시도하고, 안 되면 DOM 측정값으로 보고한다            |
| `element.focus()` 뒤에도 `:focus`가 안 맞음 | 창에 포커스가 없으면 `:focus` 선택자가 매치되지 않는다           | 같은 규칙을 속성 선택자로 바꾼 임시 `<style>`로 규칙의 우선순위만 본다 |
| 연달아 `click()`한 결과가 이상함            | 같은 틱의 두 번째 클릭이 이전 렌더의 상태를 본다                 | 클릭 사이에 기다리거나, 상태 갱신을 함수형(`set(prev => …)`)으로 쓴다  |
| CSS만 고쳤는데 가짜 응답이 사라짐           | `*.css.ts` 변경은 전체 새로고침을 일으켜 `fetch` 패치가 날아간다 | 스니펫을 다시 실행한다                                                 |
| SEED Select를 열어 값을 고르기 어려움       | 포털로 뜨는 목록이라 클릭 순서가 까다롭다                        | 계산은 단위 테스트로, 화면은 사용자에게 부탁한다                       |

## 2. 편집기에 사진 넣기

사진은 저장소에 없다(커밋 금지, `AGENTS.md` §4). **각자 가진 사진을 `samples/`(gitignore)에 넣고** 쓴다. dev 서버가 그 폴더를 그대로 내려준다. 아래 세 종류가 있어야 경로가 다 확인된다 — 파일 이름은 예시다.

| 종류                         | 왜 필요한가                                          | 예시 이름       |
| ---------------------------- | ---------------------------------------------------- | --------------- |
| 카메라 원본 JPEG             | EXIF가 전부 있는 기본 경로                           | `fuji.jpg`      |
| Lightroom에서 내보낸 큰 파일 | EXIF가 파일 뒤쪽에 있어 앞부분만 읽으면 빈 값이 된다 | `lightroom.jpg` |
| 현상소 필름 스캔             | Make/Model이 스캐너라 카메라로 쓰면 안 된다          | `film-scen.jpg` |

사진이 없으면 편집기 화면 확인은 "미실행"으로 적는다. EXIF 없는 파일 경로만 볼 때는 캔버스로 만든 이미지로도 된다(`canvas.toBlob`).

```js
const input = document.querySelector('input[type=file]');
const dt = new DataTransfer();
for (const name of ['fuji.jpg', 'film-scen.jpg']) {
  dt.items.add(
    new File([await (await fetch('/samples/' + name)).blob()], name, { type: 'image/jpeg' }),
  );
}
input.files = dt.files;
input.dispatchEvent(new Event('change', { bubbles: true }));
```

- 내보내기는 실제로 파일을 쓰지 않게 `URL.createObjectURL`과 `a.click`을 가로채 세기만 한다.
- 폰 폭은 탭을 393px로 줄여 본다. **iOS 하단 바·키보드·safe-area는 재현되지 않는다.**

## 3. 마이그레이션을 일회용 Postgres에서 돌리기

`main`에 머지하면 실제 프로젝트에 바로 적용되므로, 그 전에 로컬에서 돌려 본다. Supabase의 `auth`·`storage` 스키마는 마이그레이션이 쓰는 만큼만 흉내 낸다.

**이미 있는 마이그레이션을 전부 순서대로 적용한 다음** 새 파일을 돌린다. `init`만 올리고 새 파일로 건너뛰면 실제 DB와 다른 스키마에서 통과하거나 엉뚱한 이유로 실패한다.

```bash
docker run -d --name sr-pg -e POSTGRES_PASSWORD=x postgres:17
until docker exec sr-pg pg_isready -U postgres -q; do sleep 1; done   # 초기화가 끝나기 전에는 접속이 실패한다

docker exec -i sr-pg psql -U postgres -q -v ON_ERROR_STOP=1 <<'SQL'
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql as
  $$ select '00000000-0000-4000-8000-000000000001'::uuid $$;
create role authenticated;
insert into auth.users values ('00000000-0000-4000-8000-000000000001');

create schema storage;
create table storage.buckets (
  id text primary key, name text, public boolean,
  file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text, name text
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql as
  $$ select string_to_array(name, '/') $$;
SQL

# 1) 새 파일을 뺀 나머지를 순서대로
for f in supabase/migrations/*.sql; do
  [ "$f" = "supabase/migrations/<새 파일>.sql" ] && continue
  docker exec -i sr-pg psql -U postgres -q -v ON_ERROR_STOP=1 < "$f" || { echo "FAILED $f"; break; }
done
# 2) 기존 데이터를 흉내 낸 행을 넣는다 — 경계 조합을 전부
# 3) 새 파일
docker exec -i sr-pg psql -U postgres -q -v ON_ERROR_STOP=1 < "supabase/migrations/<새 파일>.sql"
docker exec sr-pg psql -U postgres -Atc "select …"   # 결과 확인
docker rm -f sr-pg
```

- **목록 질의(정렬·검색·끊어 받기)는 같은 Postgres에 PostgREST를 붙여 본다.** 가짜 응답은 질의를 흉내 내지 못한다. `authenticator` 역할을 만들고 `postgrest/postgrest` 컨테이너를 `PGRST_DB_ANON_ROLE=authenticated`, `PGRST_DB_MAX_ROWS=1000`으로 띄운 뒤, §1의 `fetch` 패치에서 `/rest/v1/…`을 그 주소로 넘긴다(인증 헤더는 지운다). 끝을 넘긴 요청이 416으로 오는 것은 이렇게 해서 찾았다(2026-10-13, PostgREST 16.4). RLS까지 보려면 `auth.uid()`를 `current_setting('request.jwt.claims', true)::json ->> 'sub'`로 두고 `PGRST_JWT_SECRET`으로 서명한 토큰을 사용자별로 만든다. **`fold_search`를 고치면 같은 문자열 묶음을 DB 함수와 `searchWords`에 넣어 결과를 대조한다** — `POSTGRES_INITDB_ARGS=--locale=C`로 만든 DB에서도 한 번 돌린다.
- 이 스텁으로 지금 있는 일곱 개가 처음부터 끝까지 적용되는 걸 확인했다(2026-10-11).
- **기존 행을 바꾸는 `update`는 조합별 샘플을 넣고 본다.** 상태·소유 이관 때 "대여 + 수리 중"이 덮어써져 되돌릴 수 없게 되는 걸 리뷰에서야 잡았다.
- Storage는 정책 문법과 버킷 행까지만 확인된다. 실제 업로드·서명 URL·크기 제한 동작은 확인되지 않는다.
- 적용 뒤에는 `main` 커밋의 `Supabase Preview` 체크가 성공인지, 새 컬럼이 REST로 조회되는지 본다.

## 4. PR 하나만 따로 검사하기

스택으로 쌓인 브랜치나 다른 에이전트가 만든 브랜치는, 작업 디렉터리를 건드리지 않고 그 커밋만 꺼내 검사한다.

```bash
tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT
git archive origin/<브랜치> | tar -x -C "$tmpdir"

# 의존성이 그대로면 지금 것을 빌려 쓰고, 바뀌었으면 그 커밋의 lockfile로 설치한다
if git diff --quiet HEAD origin/<브랜치> -- package.json pnpm-lock.yaml; then
  ln -s "$PWD/node_modules" "$tmpdir/node_modules"
else
  (cd "$tmpdir" && pnpm install --frozen-lockfile)
fi
(cd "$tmpdir" && pnpm check-types && pnpm lint && pnpm test && pnpm build)
```

`node_modules`를 빌려 쓰면 빠르지만, `package.json`이나 `pnpm-lock.yaml`이 다른 커밋을 지금 의존성으로 검사하게 된다. 그 경우엔 통과해도 의미가 없다.

## 5. 실기기에서만 확인되는 것

지금까지 자동화로 확인하지 못해 사용자가 직접 본 것, 또는 아직 못 본 것.

| 항목                                                 | 상태                                                                                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| iOS "사진 찍기"로 찍은 파일에 촬영 정보가 없음       | 사용자가 확인(보관함에서 고르면 있음). 같은 보고가 WebKit 버그 207088 댓글에 있다. "사진 찍기" 항목이 항상 표시되는 것은 버그 236981 |
| 편집기 하단이 Safari 바 뒤로 비치는지                | 미확인                                                                                                                               |
| 키보드가 올라왔을 때 입력칸이 미리보기에 안 가리는지 | 미확인                                                                                                                               |
| "사진 찍기" 안내 문구가 실제로 뜨는지                | 미확인(파일 수정 시각이 방금으로 오는지에 달렸다)                                                                                    |
| 여러 파일 다운로드 허용 창, 디스크에 실제로 쓰임     | 미확인                                                                                                                               |
| 링크 미리보기(카카오톡·iMessage)                     | 미확인. 이미지·태그가 프로덕션에 있는 것까지만 확인                                                                                  |
