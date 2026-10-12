---
title: 'MR 설명 쓰기 귀찮아서 Claude Code 스킬로 만들었다'
description: 'git diff를 읽어 팀 표준 Merge Request 템플릿을 채워주는 커스텀 스킬. 브랜치명에서 이슈키 추출, 작업 유형 판별, 리뷰 포인트 자동 제안까지.'
pubDate: '2026-09-09'
---

<figure class="img-placeholder">
  <p><strong>🖼️ 이미지 자리 #1 (히어로)</strong> — 빈 MR 템플릿이 자동으로 채워지는 장면</p>
  <p><strong>프롬프트:</strong> Flat vector illustration of a merge request form on a screen, left half empty with dotted placeholder lines, right half filled with neat checkboxes and bullet points, a small robot arm with a pen filling it in. Soft purple and teal palette, no readable text, 16:9.</p>
  <!-- IMAGE: mr-skill-hero.png -->
</figure>

팀에는 Merge Request 설명 템플릿이 있습니다. 개요, 작업 유형 체크박스, 변경 사항, 작업 체크리스트, 리뷰어 검토 요청, 참고 자료. 좋은 양식인데 문제는 **매번 손으로 채운다**는 것입니다. 변경 사항은 diff를 다시 보면서 쓰고, 이슈키는 브랜치명에서 복사하고, 리뷰 요청은 대충 "확인 부탁드립니다"로 끝나기 일쑤였습니다.

그래서 Claude Code 커스텀 스킬로 만들었습니다. `~/.claude/skills/mr/SKILL.md` 파일 하나입니다.

## 스킬이 하는 일

"MR 작성해줘"라고 하면:

1. `git diff origin/master...HEAD`로 변경 범위를 잡는다
2. 브랜치명·커밋 메시지에서 Jira 이슈키를 추출한다
3. diff를 읽고 변경 사항을 사람이 읽는 문장으로 요약한다
4. 작업 유형(신규/버그/개선/문서) 중 하나를 체크한다
5. **diff 신호에 따라 리뷰어가 봐야 할 지점을 제안한다**
6. 팀 템플릿에 채워서 마크다운 코드블록 하나로 출력한다

출력을 통째로 복사해 GitLab MR 설명란에 붙이면 끝입니다.

## 설계하면서 정한 것들

### base는 무조건 master, 비교는 3-dot

```bash
git diff origin/master...HEAD --name-only
git log origin/master..HEAD --oneline
```

우리 팀은 release 브랜치에서 task 브랜치를 따는 모델입니다. 2-dot(`..`)으로 비교하면 release에 이미 들어간 남의 커밋까지 섞입니다. 3-dot(`...`)은 merge-base 이후 **내 커밋만** 잡아줘서 노이즈가 없습니다. 이걸 스킬에 명시해두니 Claude가 매번 "base 브랜치가 뭔가요?"라고 묻지 않습니다.

### 리뷰 포인트는 "신호가 있을 때만"

이 스킬의 진짜 가치는 리뷰어 검토 요청 자동 제안입니다. diff 패턴과 제안 항목을 표로 정의해뒀습니다.

| diff 신호 | 자동 제안 |
|---|---|
| `CREATE INDEX`, 인덱스 변경 | 신규 DB 인덱스 적절성 검토 |
| `@Transactional` 추가, 다중 테이블 쓰기 | 트랜잭션 처리 및 데이터 무결성 확인 |
| JWT/인증/암호화/`token` | 보안 처리 검토 (토큰 만료·암호화) |
| 신규 엔드포인트 | 응답 포맷 및 상태 코드 검토 |
| 반복 쿼리, 대량 조회 | 쿼리 성능 및 N+1 여부 |
| 외부 연동 추가 | 실패/타임아웃 처리 검토 |

중요한 건 **해당 신호가 없으면 비워둔다**는 규칙입니다. 억지로 리뷰 항목을 채우면 리뷰어가 피로해지고, 결국 아무도 안 읽게 됩니다.

<figure class="img-placeholder">
  <p><strong>🖼️ 이미지 자리 #2</strong> — diff 신호가 리뷰 체크박스로 변환되는 흐름도</p>
  <p><strong>프롬프트:</strong> Minimal flowchart illustration: on the left a code diff block with red and green lines, arrows pointing to the right into three checkbox items with small icons (a database cylinder, a lock, a clock). Flat design, light background, no readable text.</p>
  <!-- IMAGE: diff-to-review-points.png -->
</figure>

### 작업 체크리스트는 자동 체크하지 않는다

템플릿에 "Jira 상태 변경", "롤백 플랜 준비" 같은 작성자 체크리스트가 있습니다. 처음엔 이것도 diff 보고 체크하게 하려다 그만뒀습니다. **체크는 사람이 책임지는 행위**이고, AI가 `[x]`를 찍어두면 그냥 넘어가게 됩니다. 대신 "DB 변경이 감지됐으니 마이그레이션 항목을 확인하세요"처럼 분석 요약에서 짚어주는 방식으로 바꿨습니다.

### 모르면 모른다고 쓴다

```
- 추측으로 단정하지 않음 — diff로 확인되지 않은 항목은
  작성 예시 또는 <!-- 확인 필요 --> 주석으로 남김
```

이슈키를 못 찾으면 `DEV-XXXXX`로 두고 한 번 묻습니다. 그럴듯하게 지어내는 것보다 빈칸이 낫습니다.

## 실제 출력 예시 (일부)

```markdown
🔍 MR 자동 분석 결과
━━━━━━━━━━━━━━━━━━━━━━━━━━━
브랜치   : feature/DEV-12345-social-login (base: master)
이슈키   : DEV-12345
작업 유형 : 신규 기능
변경 규모 : 12 files (+340 / -28)

⚠️ 체크리스트에서 특히 확인 필요:
  - DB 변경 감지(users 테이블 컬럼 추가) → 마이그레이션 준비 필수
  - 신규 외부 연동(OAuth) → 롤백 플랜 점검 권장
```

그 아래로 템플릿이 채워진 마크다운 블록이 이어집니다.

## 스킬 파일 구조

SKILL.md 하나에 다 들어 있습니다. 크게 네 부분입니다.

- **frontmatter**: `name`, `description`. description에 트리거 키워드("MR 작성", "PR 올려줘")와 **트리거하지 말아야 할 경우**(커밋 메시지 작성, 코드 리뷰 요청)를 같이 적습니다. 이게 없으면 엉뚱한 요청에 스킬이 발동합니다.
- **템플릿 원문**: `{...}` 자리표시자가 있는 팀 양식. "이모지·구분선은 변경 금지"를 명시.
- **워크플로우**: Step 0 범위 파악 → Step 1 분석 → Step 2 제목 → Step 3 출력.
- **주의사항**: 민감정보 금지, 파일 30개 넘으면 요약 등.

## 쓰고 나서

- 한 달 정도 쓰니 MR 설명 쓰는 시간이 거의 0이 됐습니다. 대신 **출력을 읽고 고치는 시간**은 남습니다. 그게 맞다고 봅니다.
- 리뷰어 쪽 반응이 더 좋았습니다. "어디를 봐야 하는지"가 적혀 있는 MR과 아닌 MR은 리뷰 속도가 다릅니다.
- 같은 패턴으로 배포 체크리스트 스킬, 산출물 문서 스킬도 만들었습니다. 그 얘기는 다음에.

<figure class="img-placeholder">
  <p><strong>🖼️ 이미지 자리 #3</strong> — 스킬 파일 하나에서 MR·체크리스트·문서가 갈라져 나오는 모습</p>
  <p><strong>프롬프트:</strong> Flat illustration of a single markdown file icon at the center, with three branches growing out to a merge request icon, a checklist icon, and a document icon. Organic branching lines, soft green and gray palette, no readable text.</p>
  <!-- IMAGE: skill-family.png -->
</figure>
