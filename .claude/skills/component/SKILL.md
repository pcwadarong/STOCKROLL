---
name: component
description: STOCKROLL에서 새 UI 컴포넌트·화면을 구현할 때의 절차 스킬. "컴포넌트 만들어줘", "화면 구현", "UI 추가", "페이지 만들어줘", "버튼/시트/목록 컴포넌트" 요청 시 트리거한다. FSD 레이어 배치·SEED 우선·vanilla-extract 토큰·접근성을 강제한다. SEED 자체의 설치·업그레이드·진단은 다루지 않는다(→ seed-design 스킬).
---

# Component — UI 컴포넌트·화면 구현

> 규칙 기준: `AGENTS.md` §1(FSD), §2(스타일), §6(접근성). 여기선 **구현 순서와 패턴**만 다룬다.

## Step 1: 레이어·위치 결정

"누가 이걸 소유하는가"로 정한다.

| 대상                           | 위치                                     |
| ------------------------------ | ---------------------------------------- |
| 화면 전체 조립                 | `src/pages/{page}/ui/{Page}Page.tsx`     |
| 여러 화면이 공유하는 독립 블록 | `src/widgets/{block}/ui/*`               |
| 상호작용·상태가 있는 기능 단위 | `src/features/{feature}/ui/*` + `model/` |
| 도메인 데이터를 그리는 UI      | `src/entities/{domain}/ui/*`             |
| 도메인을 모르는 범용 UI        | `src/shared/ui/*`                        |

- 같은 상태·생명주기를 공유하면 슬라이스를 쪼개지 않는다(`features/frame-photo`가 열기·캡션·내보내기를 모두 가진다).
- 슬라이스마다 `index.ts`로 공개할 것만 내보낸다.

## Step 2: 이미 있는 부품부터 찾는다

SEED보다 먼저 이 저장소의 공통 부품을 본다. 같은 모양을 페이지마다 다시 만들지 않는다(`AGENTS.md` §2).

| 필요한 것                    | 쓸 것                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| 화면 틀·제목·내용 상자       | `widgets/page-shell`, `shared/ui/PageHeader`, `Panel`                                        |
| 버튼, 켜고 끄는 버튼         | `shared/ui/Button` (`pressed`로 토글)                                                        |
| 드롭다운                     | `shared/ui/PickField` — 폼은 기본, 촘촘한 패널은 `size="medium"`, 필터 줄은 `hideLabel` 추가 |
| 폼 전체                      | `shared/ui/RecordForm` + 필드 정의(`RecordField[]`)                                          |
| 목록 위 요약                 | `shared/ui/MetaList` 두 줄                                                                   |
| 좁혀 보는 목록               | `pages/library/ui/LibraryList`의 `ListFilters` + `ItemList`, 계산은 `shared/lib/pick-filter` |
| 비어 있음·로딩, 오류, 확인창 | `EmptyState`, `ErrorText`, `ConfirmDialog`                                                   |
| 글자 목소리                  | `shared/ui/label.css.ts`의 `displayText` / `labelText` / `labelTitle`                        |

맞는 게 없을 때만 다음 단계로 간다.

## Step 3: SEED에서 찾는다

1. `seed-docs` MCP의 `list_react_components` 또는 `https://seed-design.io/react/llms.txt`에서 맞는 컴포넌트를 찾는다. 기억으로 API를 쓰지 않는다.
2. 스니펫을 받는다: `pnpm dlx @seed-design/cli@latest add ui:{id}`
3. `seed-design/ui/{id}`에서 import한다. 받은 파일은 고치지 않는다.

```tsx
// src/features/frame-photo/ui/FrameEditor.tsx
import { SegmentedControl, SegmentedControlItem } from 'seed-design/ui/segmented-control';

<SegmentedControl aria-label="출력 비율" value={preset.id} onValueChange={…}>
  {OUTPUT_PRESETS.map(item => (
    <SegmentedControlItem key={item.id} value={item.id}>{item.label}</SegmentedControlItem>
  ))}
</SegmentedControl>
```

텍스트는 `@seed-design/react`의 `Text`(`textStyle`, `color`)를 쓴다.

## Step 4: 남는 부분만 `*.css.ts`

컴포넌트 옆에 `{Component}.css.ts`를 두고 `import * as css from './{Component}.css'`로 쓴다.

```ts
// src/features/frame-photo/ui/FrameEditor.css.ts
import { vars } from '@seed-design/css/vars';
import { style } from '@vanilla-extract/css';

import { COMPACT_MEDIA_QUERY } from '@/shared/config/responsive';

export const panel = style({
  gap: vars.$dimension.x6,
  background: vars.$color.bg.layerDefault,
  borderLeft: `1px solid ${vars.$color.stroke.neutralSubtle}`,
  '@media': { [COMPACT_MEDIA_QUERY]: { borderLeft: 0 } },
});
```

- 색·간격·radius·글자 크기는 `vars`만. 레이아웃 치수는 `rem`/`dvh`.
- SEED 컴포넌트의 모양을 고쳐야 하면 스니펫이 아니라 `src/app/seed-overrides.css.ts`에서 `html` 접두 선택자로 덮는다. 크기는 먼저 SEED의 변형(`size="medium"`)을 찾는다.
- SEED 루트 요소는 `className`을 안쪽 요소에 붙이는 경우가 있다(`TextField`). 바깥 틀을 배치해야 하면 부모에서 `globalStyle(`${parent} > *`, …)`로 잡는다.
- 폰 화면은 문서가 스크롤하게 짠다. `100dvh` 고정 틀 + 안쪽 스크롤은 iOS 하단 바 뒤에 빈 띠를 남긴다(`AGENTS.md` §2-6).
- 컴포넌트가 margin/gap prop을 받지 않는다. 바깥 배치는 호출부가 `className`으로.

## Step 5: 상태와 계산 분리

- 상태·부수효과는 `model/use-*.ts` 훅으로, 입력→출력 계산은 `entities/*/model|lib` 순수 함수로.
- 훅이 ref를 돌려주면 컴포넌트에서 **구조 분해해서** 쓴다(`const { canvasRef, hasPhoto } = useFrameEditor()`). 객체째 들고 `editor.hasPhoto`로 읽으면 `react-hooks/refs` 린트가 렌더 중 ref 접근으로 본다.

## Step 6: 접근성

- 시맨틱 요소(`main`/`section`/`aside`/`fieldset`+`legend`) 우선.
- SEED 컨트롤에 `aria-label` 또는 보이는 라벨. `canvas`에는 `role="img"` + `aria-label`.
- 오류는 `role="alert"`, 값이 바뀌는 안내 문구는 `aria-live="polite"`.
- 설정 패널을 `<form>`으로 감싸지 않는다 — 입력 중 Enter가 첫 버튼을 눌러 버린다.

## Step 7: 검증

```bash
pnpm check-types && pnpm lint && pnpm test
pnpm dev   # 사진을 열어 저장까지 직접 확인
# 로그인해야 보이는 화면은 docs/verification.md §1 (가짜 세션 + 가짜 응답)
```

## 자가 확인

- [ ] SEED에 있는 컨트롤을 직접 만들지 않았는가? `seed-design/` 파일을 고치지 않았는가?
- [ ] `*.css.ts`에 hex·px 하드코딩이 없는가?
- [ ] 레이어 배치와 `index.ts` 공개 API를 지켰는가?
- [ ] 계산이 순수 함수로 빠져 있는가?
- [ ] 키보드만으로 모든 조작이 되는가? export마다 영어 JSDoc이 있는가? UI 문구가 영어인가?
- [ ] 브라우저에서 직접 확인했는가(못 했으면 보고)?
