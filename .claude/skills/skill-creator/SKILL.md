---
name: skill-creator
description: STOCKROLL 프로젝트용 새 스킬을 만드는 메타 스킬. "스킬 만들어줘", "skill 생성", "새 스킬 추가", "스킬 크리에이터" 요청 시 트리거한다. AGENTS.md를 단일 출처로 참조하는 SKILL.md를 생성한다. 외부에서 설치한 스킬(seed-design)은 수정하지 않는다.
---

# Skill-Creator

`.claude/skills/{name}/SKILL.md`를 일관된 형식으로 작성한다. STOCKROLL 스택(Vite + React SPA, FSD, SEED Design, vanilla-extract, Supabase) 기준으로만 만든다.

## 핵심 원칙

- **컨벤션은 복제하지 않는다.** 단일 출처는 `AGENTS.md`다. 스킬은 `> 규칙 기준: AGENTS.md §N`으로 참조한다.
- 스킬은 **절차·실제 코드 예시·체크리스트**만 가진다.
- `.claude/skills/seed-design/`은 `skills-lock.json`으로 관리되는 외부 스킬이다. 고치지 않고 `pnpm dlx skills update`로 갱신한다.

## Step 1: 정보 확인

| 항목   | 규칙                                             |
| ------ | ------------------------------------------------ |
| 이름   | kebab-case, frontmatter `name`과 디렉터리명 일치 |
| 위치   | `.claude/skills/{name}/SKILL.md`                 |
| 트리거 | 사용자가 부를 자연어 문구 3개 이상               |
| 참조   | 의존하는 `AGENTS.md` 섹션                        |

## Step 2: frontmatter

```markdown
---
name: {name}
description: {한 줄 역할}. "{문구1}", "{문구2}", "{문구3}" 요청 시 트리거한다. {하지 않는 일}(→ {대신 쓸 스킬}).
---
```

## Step 3: 본문

한국어 명령형(`~한다`). 구조는 표 · `Step N` · 코드 블록 · `## 자가 확인`.

- 첫 문단에 범위를 적는다.
- 예시는 **이 저장소의 실제 파일**을 인용한다(`src/entities/frame/model/layout.ts`, `src/features/frame-photo/model/use-frame-editor.ts`). 아직 없는 코드를 전제로 한 스킬은 만들지 않는다 — 첫 구현이 생긴 뒤에 그 패턴으로 쓴다.

## Step 4: 연결

`CLAUDE.md`의 작업→스킬 표에 한 줄 추가한다.

## 자가 확인

- [ ] `name`이 디렉터리명과 같은가? 트리거 문구가 3개 이상인가?
- [ ] 규칙을 복제하지 않고 `AGENTS.md`를 참조했는가?
- [ ] 예시가 실제 파일을 인용하는가?
- [ ] `CLAUDE.md` 표에 추가했는가?
