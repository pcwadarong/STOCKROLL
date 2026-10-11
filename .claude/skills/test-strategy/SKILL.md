---
name: test-strategy
description: STOCKROLL에서 무엇을 어디에 어떻게 테스트할지 정하는 절차 스킬. "테스트 작성", "테스트 추가", "이거 어떻게 테스트해", "테스트 리뷰해줘" 요청 시 트리거한다. 테스트 위치 판별과 계약 기반 문장 규칙만 다루고, 구현 절차는 다루지 않는다(→ component).
---

# Test-Strategy — 테스트 위치 판별 + 계약 기반 작성

> 규칙 기준: `AGENTS.md` §4(테스트).

## Step 1: 어디서 검증할지

위에서부터 묻는다. 먼저 참인 조건을 따른다.

1. **DOM·캔버스 없이 입력→출력이 정해지는가?** (레이아웃 계산, EXIF 포맷, 파일명) → 구현 옆 `*.test.ts`, Node 환경. **기본값이다.**
   - 예: `src/entities/frame/model/layout.test.ts`, `src/entities/photo/lib/format-exif.test.ts`
2. **캔버스·`createImageBitmap`·File API 스텁이 필요한가?** → 멈춘다. 스텁을 늘리는 대신 계산을 `entities/*/model|lib` 순수 함수로 뽑아 1번으로 보낸다. `drawFrame`이 좌표를 계산하지 않고 `computeLayout` 결과를 받기만 하는 게 이 분리다.
3. **실제 픽셀·파일 저장·공유 시트·PWA 설치가 계약인가?** → 자동 테스트로 흉내 내지 않는다. `pnpm dev`로 띄워 실제 브라우저에서 사진을 열고 저장까지 확인하고, 확인한 내용을 보고에 적는다.

React 컴포넌트 렌더 테스트(jsdom)는 아직 환경이 없다. 필요해지면 사용자에게 확인한 뒤 추가한다.

```bash
pnpm test          # 전체
pnpm test:watch    # 작업 중
```

## Step 2: 계약 기반 설명

형식(영어로 쓴다): **"when [condition], it must [expected result]"**

- 나쁜 예: `"레이아웃이 계산된다"`, `"works"` — 조건과 결과가 없다.
- 좋은 예: `"when 35mm equivalent is selected but EXIF has none, it must keep the actual value instead of computing one"`

## Step 3: 도메인 규칙은 테스트로 고정한다

`AGENTS.md` §3의 규칙은 코드 리뷰가 아니라 테스트가 지킨다. 새 포맷터·변환 함수를 만들면 **값이 없을 때** 케이스를 반드시 넣는다 — 빈 문자열/`undefined`가 나와야 하고, 기본값이나 추정값이 나오면 안 된다.

## Step 4: 테스트 데이터

- 실제 사진 파일을 커밋하지 않는다. EXIF는 객체 리터럴로 만든다(`{ iso: 1250, focalLength: 72 }`).
- 브라우저 확인용 사진은 `.tmp/`나 `samples/`에 둔다(gitignore).
- 날짜가 걸리면 `TZ=UTC pnpm test`로 한 번 더.

## 자가 확인

- [ ] 스텁을 추가하기 전에 순수 함수 추출을 먼저 검토했는가?
- [ ] 모든 설명이 "[조건]일 때 [주체]는 [결과]해야 한다" 형식인가?
- [ ] 값이 없는 경우를 테스트했는가?
- [ ] 브라우저에서만 확인 가능한 계약을 직접 확인했거나, 못 했다고 보고했는가?
