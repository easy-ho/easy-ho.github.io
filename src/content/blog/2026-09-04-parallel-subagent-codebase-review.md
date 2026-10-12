---
title: '서브에이전트 30개로 레거시 백엔드 전체를 훑어본 방법'
description: '리포지토리 30개를 Claude Code 서브에이전트로 병렬 분석하면서 배운 것. 결과보다 "어떤 관점으로 다시 물었는가"가 더 중요했습니다.'
pubDate: '2026-09-04'
---

<figure class="img-placeholder">
  <p><strong>🖼️ 이미지 자리 #1 (히어로)</strong> — 수십 개의 작은 로봇이 각자 다른 책을 동시에 읽는 장면</p>
  <p><strong>프롬프트:</strong> Isometric flat illustration of a long library table with about thirty tiny identical robots, each reading a different thick book, and one larger robot at the head of the table collecting notes into a single report. Warm wood tones, soft blue robots, no readable text, 16:9.</p>
  <!-- IMAGE: parallel-agents-library.png -->
</figure>

워크스페이스에 백엔드 리포지토리가 30개 가까이 있습니다. 게이트웨이, 인증, 결제, 추천, 푸시, 배치, ETL까지. 전부 제가 짠 코드는 아니고, 담당자가 바뀌면서 아무도 전체 그림을 모르는 상태였습니다.

"이 중에서 개선할 게 뭐가 있는지 한 번에 보고 싶다"는 생각으로 Claude Code에게 던졌습니다. 이 글은 결과 목록이 아니라 **방법과 그 과정에서 배운 것**에 대한 기록입니다. (구체적인 취약점이나 서비스 이름은 당연히 싣지 않습니다.)

## 방법: 리포 하나당 서브에이전트 하나

```
"워크스페이스 안의 백엔드 프로젝트들을 각각 서브에이전트로 병렬 분석해서
 개선점 Top 10을 뽑아줘"
```

Claude Code는 리포 목록을 뽑고, 리포마다 Explore 성격의 서브에이전트를 띄웠습니다. 각 에이전트는 자기 리포만 읽고 발견 사항을 `파일:라인` 근거와 함께 보고합니다. 메인 세션은 그 보고를 모아 교차 이슈를 묶고 우선순위를 매깁니다.

이 구조의 장점은 명확합니다.

- **컨텍스트 격리**: 리포 30개를 한 세션에 다 넣으면 컨텍스트가 터집니다. 에이전트 하나는 리포 하나만 봅니다.
- **교차 이슈 발견**: 메인 세션이 보고서 30개를 나란히 놓으니 "HTTP 클라이언트 타임아웃이 없는 리포가 n개"처럼 **한 리포만 봐서는 안 보이는 패턴**이 드러납니다.
- **근거 강제**: 처음부터 "파일:라인 없는 주장은 버린다"고 못박았습니다. 그래야 나중에 사람이 검증할 수 있습니다.

<figure class="img-placeholder">
  <p><strong>🖼️ 이미지 자리 #2</strong> — 메인 세션이 서브에이전트들의 보고서를 모아 겹치는 패턴을 찾는 구조도</p>
  <p><strong>프롬프트:</strong> Clean diagram illustration: one large node at the top connected by thin lines to many small nodes below, each small node holding a tiny document; several documents are highlighted in the same amber color to show a repeated pattern. Flat vector, white background, no readable text.</p>
  <!-- IMAGE: fan-out-fan-in.png -->
</figure>

## 1차 결과: 전부 맞는 말인데, 와닿지 않았다

1차 Top 10은 "코드 안정성" 관점이었습니다. 커밋된 크리덴셜, 타임아웃 부재, CI에서 테스트 생략, 설정은 있는데 배선 안 된 커넥션 풀 같은 것들.

전부 고쳐야 할 것들이 맞습니다. 그런데 보고서를 읽고 든 생각은 "그래서 **독자**한테 뭐가 달라지는데?"였습니다. 저는 콘텐츠 플랫폼 백엔드를 합니다. 최종 사용자가 체감하는 효과로 우선순위를 매기고 싶었습니다.

## 2차: 질문을 바꿨다

```
"1차는 코드 안정성 위주였어. 이번엔 적용했을 때
 사용자가 체감하는 개선 관점으로 다시 분석해줘"
```

같은 코드, 같은 에이전트 구조, 질문만 바뀌었습니다. 결과는 완전히 다른 목록이 나왔습니다.

- 캐시 미스 때 락 대기가 최대 십수 초까지 늘어나는 게이트웨이 경로
- 외부 IdP 호출에 타임아웃이 없어 소셜 로그인이 무한정 늘어지는 구간
- 결제 흐름 안에서 동기로 날아가는 분석 이벤트 전송
- 실패한 결제의 락이 TTL 동안 풀리지 않아 재시도가 거부되는 문제
- 대기열 화면의 브로드캐스트 주기와 진입 스케줄러 주기 불일치로 생기는 "멈춘 것 같은" 체감

1차에는 없거나 하위에 있던 항목들입니다. **분석 도구는 같은데 관점이 결과를 결정**했습니다.

## 3차, 4차: 관점을 더 쪼갰다

여기서 재미가 붙어서 두 번 더 돌렸습니다.

- **3차**: 웹 프론트에서 역추적. "프론트의 어떤 UX 문제가 백엔드 어디서 비롯되는가." 그리고 데이터 신선도 파이프라인(랭킹·검색 인덱스·ETL)의 지연 원인.
- **4차**: 5개 축으로 재정리. 인가 결함 / 배포 복원력 / 비용 / 중복 코드 / 운영자 도구.

4차에서 특히 유용했던 게 **중복 축**이었습니다. 같은 외부 API 클라이언트가 9벌, 같은 JWT 설정이 8벌, Slack 알림 코드가 8벌. 그중 일부는 오타까지 그대로 복사돼 있었습니다. 리포 하나만 보면 절대 안 보이는 것들입니다.

<figure class="img-placeholder">
  <p><strong>🖼️ 이미지 자리 #3</strong> — 같은 분석 대상을 네 가지 다른 렌즈로 보는 개념도</p>
  <p><strong>프롬프트:</strong> Flat illustration of a single gray cube in the center, viewed through four different colored magnifying glasses arranged around it (blue, amber, green, red), each lens showing a slightly different highlighted facet of the cube. Minimal vector style, light background, no readable text.</p>
  <!-- IMAGE: four-lenses.png -->
</figure>

## 배운 것

**1. 첫 결과는 거의 항상 "기본 관점"이다.** 아무 관점도 안 주면 모델은 코드 품질·보안 같은 일반론으로 갑니다. 틀린 게 아니라 내가 원하는 축이 아닐 뿐입니다. 관점을 명시하고 다시 묻는 비용은 매우 싸고, 결과 차이는 큽니다.

**2. 근거 강제가 결과의 신뢰도를 만든다.** `파일:라인`이 붙은 항목은 바로 열어서 확인할 수 있었고, 실제로 몇 개는 오탐이었습니다. 근거가 없었다면 오탐을 걸러낼 방법이 없었을 겁니다.

**3. 정적 분석의 한계는 분명하다.** 보고서 마지막에 Claude가 스스로 적은 한계가 정확했습니다. "전부 정적 분석. APM 실측, CDN/엣지 설정, 크리덴셜 유효성은 미확인." 예를 들어 "gzip 미설정"은 엣지에서 압축하고 있으면 문제가 아닙니다. 결과를 바로 티켓으로 만들면 안 되고, 실측과 대조하는 단계가 필요합니다.

**4. 메모리에 남겨두면 다음 세션이 이어진다.** 분석 결과와 "이 사용자는 사용자 체감 관점을 중시한다"는 선호를 Claude가 메모리 파일로 남겼습니다. 며칠 뒤 다른 세션에서 비슷한 요청을 했을 때 1차 관점으로 되돌아가지 않았습니다.

## 다음에 할 것

4차 결과 중 몇 개는 실제 티켓이 됐습니다. 수정이 끝나면 "정적 분석 결과 vs 실제 수정 후 변화"를 비교해볼 생각입니다. 그게 이 방법이 진짜 쓸모 있는지 판단할 유일한 기준이니까요.
