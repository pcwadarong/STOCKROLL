---
name: code-quality
description: STOCKROLL 코드를 컨벤션 기준으로 점검하고 개선하는 스킬. "코드 개선", "리팩터", "리뷰해줘", "정리해줘", "컨벤션 점검" 요청 시 트리거한다. AGENTS.md 1~3절을 기준으로 검토 후 고친다. PR에 달린 리뷰 반영은 다루지 않는다(→ follow-review).
---

# Code-Quality — 코드 점검·개선

변경된 코드가 컨벤션을 지키는지 점검하고, 위반은 `파일:라인`으로 보고한 뒤 고친다.

> 규칙 기준: `AGENTS.md` §1(FSD), §2(개발 표준·스타일), §3(도메인 규칙).

## Step 1: 변경 파일 확인

```bash
git diff --name-only HEAD
```

## Step 2: 체크리스트

**레이어 (§1)**

- [ ] `app → pages → widgets → features → entities → shared` 역방향 import가 없는가?
- [ ] 슬라이스 밖에서 내부 파일을 직접 import하지 않는가? (`grep -rn "@/entities/[a-z-]*/\(model\|lib\|ui\)" src`)
- [ ] 같은 상태를 공유하는 로직이 여러 feature로 쪼개지지 않았는가?
- [ ] 순수 계산이 훅·컴포넌트 안에 인라인으로 들어가 있지 않은가?

**개발 표준 (§2)**

- [ ] `const` 화살표 함수, `@/` alias, export마다 영어 JSDoc. UI 문구·주석·테스트 설명에 한글이 없는가? (`grep -rnP "[\x{AC00}-\x{D7A3}]" src`)
- [ ] 불필요한 `div`, 죽은 코드, 미사용 export, 임시 로그가 없는가?

**스타일 (§2)**

- [ ] SEED에 있는 컨트롤을 직접 만들지 않았는가?
- [ ] `seed-design/`이 diff에 있다면 CLI로 받은 것인가(손으로 고친 게 아닌가)?
- [ ] `*.css.ts`에 hex·px가 없는가? (`grep -rnE "#[0-9a-fA-F]{3,8}\b|[0-9]px" src --include="*.css.ts"`) — `entities/frame`의 캔버스 상수와 `1px`·`2px` 선 두께는 예외. 원본 색 값은 `shared/config/palette.ts`에만.

**도메인 (§3)**

- [ ] 없는 값을 추정·계산해 채우는 코드가 없는가?
- [ ] 사진 `Blob`/`File`/base64가 `fetch`나 Supabase로 나가는 경로가 없는가?
- [ ] 값의 출처(EXIF/수동)가 구분돼 저장·표시되는가?

## Step 3: 검증

```bash
pnpm check-types && pnpm lint && pnpm test
pnpm build   # dev 서버가 떠 있으면 생략
```

실패하면 에러 메시지 전체를 보고에 포함한다.

## Step 4: 수정

위반을 고친다. 범위가 커지면 분리(다음 작업)를 제안한다.

## 자가 확인

- [ ] 모든 지적에 `파일:라인`을 달았는가?
- [ ] 검증 명령을 실제로 실행하고 결과를 포함했는가?
