---
title: 'MR 설명 쓰기 귀찮아서 자동화했다'
description: 'git diff 읽어서 팀 MR 템플릿 채워주는 Claude Code 스킬. 리뷰 포인트까지 뽑아주는 게 핵심.'
pubDate: '2026-09-09'
---

<figure class="post-img">
  <img src="/images/mr-skill-hero.svg" alt="빈 MR 템플릿이 자동으로 채워지는 장면" loading="lazy" />
  <figcaption>빈 MR 템플릿이 자동으로 채워지는 장면<details><summary>프롬프트</summary>Flat vector illustration of a merge request form on a screen, left half empty with dotted placeholder lines, right half filled with neat checkboxes and bullet points, a small robot arm with a pen filling it in. Soft purple and teal palette, no readable text, 16:9.</details></figcaption>
  <!-- IMAGE: mr-skill-hero.svg -->
</figure>

팀에 MR 템플릿이 있다. 개요, 작업 유형, 변경 사항, 체크리스트, 리뷰 요청, 참고 자료. 양식 자체는 좋은데 **매번 손으로 채우는 게 문제**다. 변경 사항은 diff 다시 보면서 쓰고, 이슈키는 브랜치명에서 복사하고, 리뷰 요청은 결국 "확인 부탁드립니다" 한 줄.

그래서 Claude Code 스킬로 만들었다. `~/.claude/skills/mr/SKILL.md` 파일 하나.

## 뭘 하나

"MR 작성해줘" 하면:

1. `git diff origin/master...HEAD`로 변경 범위 잡고
2. 브랜치명·커밋에서 Jira 이슈키 뽑고
3. diff 읽어서 변경 사항을 사람 말로 요약하고
4. 작업 유형(신규/버그/개선/문서) 하나 체크하고
5. **diff 신호 보고 리뷰어가 봐야 할 지점 제안하고**
6. 템플릿에 채워서 마크다운 블록 하나로 뱉는다

통째로 복사해서 GitLab에 붙이면 끝.

## 정하면서 고민한 것들

### base는 master 고정, 비교는 3-dot

```bash
git diff origin/master...HEAD --name-only
git log origin/master..HEAD --oneline
```

우리는 release 브랜치에서 task 브랜치 따는 모델이다. 2-dot(`..`)으로 비교하면 release에 이미 들어간 남의 커밋까지 딸려온다. 3-dot(`...`)은 merge-base 이후 **내 커밋만** 잡힌다. 이걸 스킬에 박아두니까 매번 "base 브랜치 뭐예요?" 안 물어본다.

### 리뷰 포인트는 신호 있을 때만

이 스킬에서 제일 쓸모 있는 부분. diff 패턴이랑 제안 항목을 표로 정해뒀다.

| diff에 이런 게 보이면 | 이렇게 제안 |
|---|---|
| `CREATE INDEX`, 인덱스 변경 | 신규 DB 인덱스 적절성 검토 |
| `@Transactional` 추가, 다중 테이블 쓰기 | 트랜잭션 처리 및 데이터 무결성 확인 |
| JWT/인증/암호화/`token` | 보안 처리 검토 |
| 신규 엔드포인트 | 응답 포맷 및 상태 코드 검토 |
| 반복 쿼리, 대량 조회 | N+1 여부 |
| 외부 연동 추가 | 실패/타임아웃 처리 |

중요한 건 **해당 없으면 비워둔다**는 규칙. 억지로 채우면 리뷰어가 피로해지고 결국 아무도 안 읽는다.

<figure class="post-img">
  <img src="/images/diff-to-review-points.svg" alt="diff 신호가 리뷰 체크박스로 변환되는 흐름도" loading="lazy" />
  <figcaption>diff 신호가 리뷰 체크박스로 변환되는 흐름도<details><summary>프롬프트</summary>Minimal flowchart illustration: on the left a code diff block with red and green lines, arrows pointing right into three checkbox items with small icons (a database cylinder, a lock, a clock). Flat design, light background, no readable text.</details></figcaption>
  <!-- IMAGE: diff-to-review-points.svg -->
</figure>

### 작업 체크리스트는 자동 체크 안 함

템플릿에 "Jira 상태 변경", "롤백 플랜 준비" 같은 작성자 체크리스트가 있다. 처음엔 이것도 diff 보고 체크하게 하려다 관뒀다. 체크는 사람이 책임지는 건데 AI가 `[x]` 찍어두면 그냥 넘어가게 된다. 대신 "DB 변경 감지됐으니 마이그레이션 항목 확인해라" 정도로 요약에서 짚어주는 걸로.

### 모르면 모른다고

이슈키 못 찾으면 `DEV-XXXXX`로 두고 한 번 묻는다. 그럴듯하게 지어내는 것보다 빈칸이 낫다. 스킬 파일에 이렇게 적어뒀다.

```
diff로 확인되지 않은 항목은 작성 예시 또는 <!-- 확인 필요 --> 주석으로 남김
```

## 출력 예시

```markdown
🔍 MR 자동 분석 결과
━━━━━━━━━━━━━━━━━━━━━━━━━━━
브랜치   : feature/DEV-12345-social-login (base: master)
이슈키   : DEV-12345
작업 유형 : 신규 기능
변경 규모 : 12 files (+340 / -28)

⚠️ 체크리스트에서 특히 확인 필요:
  - DB 변경 감지(users 테이블 컬럼 추가) → 마이그레이션 준비
  - 신규 외부 연동(OAuth) → 롤백 플랜 점검
```

이 아래로 템플릿 채워진 마크다운이 붙는다.

## 스킬 파일 구조

SKILL.md 하나에 다 들어 있다.

- **frontmatter**: `name`, `description`. description에 트리거 키워드("MR 작성", "PR 올려줘")랑 **트리거하면 안 되는 경우**(커밋 메시지, 코드 리뷰)를 같이 적는다. 이거 없으면 엉뚱한 요청에 발동한다.
- **템플릿 원문**: `{...}` 자리표시자 있는 팀 양식. "이모지·구분선 변경 금지" 명시.
- **워크플로우**: 범위 파악 → 분석 → 제목 → 출력.
- **주의사항**: 민감정보 금지, 파일 30개 넘으면 요약 등.

## 한 달 써보니

- MR 설명 쓰는 시간은 거의 0. 대신 출력 읽고 고치는 시간은 남는다. 그게 맞는 것 같다.
- 리뷰어 반응이 더 좋았다. "어디 봐야 하는지" 적힌 MR이랑 아닌 MR은 리뷰 속도가 다르다.
- 같은 패턴으로 배포 체크리스트 스킬, 산출물 문서 스킬도 만들었다. 그건 다음에.

<figure class="post-img">
  <img src="/images/skill-family.svg" alt="스킬 파일 하나에서 MR·체크리스트·문서가 갈라져 나오는 모습" loading="lazy" />
  <figcaption>스킬 파일 하나에서 MR·체크리스트·문서가 갈라져 나오는 모습<details><summary>프롬프트</summary>Flat illustration of a single markdown file icon at the center, with three branches growing out to a merge request icon, a checklist icon, and a document icon. Organic branching lines, soft green and gray palette, no readable text.</details></figcaption>
  <!-- IMAGE: skill-family.svg -->
</figure>
