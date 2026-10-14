---
category: '실시간 서버'
title: '초당 145만 프레임, 그중 96%는 아무도 안 보는 거였다'
description: '500명이 동시에 움직이는 퀴즈 서버에서 브로드캐스트가 인원수 제곱으로 터졌다. 렌더 그룹 단위로 채널을 쪼개서 초당 5만으로 내린 기록.'
pubDate: '2026-09-05'
---

![한 점에서 수백 갈래로 퍼지는 선이 화면을 가득 메우다가, 작은 묶음 단위로 정리되는 대비](/images/fanout-before-after.jpg)
<!-- IMAGE-PROMPT: Flat vector illustration, two panels side by side. Left: a single node in the center shooting hundreds of thin tangled lines to a dense ring of small dots, overwhelming and messy. Right: the same dots arranged in small clusters of about twenty, each cluster with its own short neat lines inside, calm and orderly. Soft blue and gray palette, white background, no text, 16:9. -->

필드 위에서 캐릭터 500개가 돌아다니고, 마감 순간에 서 있는 존으로 정답을 판정하는 서바이벌 퀴즈 서버를 혼자 만들었다. Kotlin, WebFlux, WebSocket, Redis Pub/Sub. 오픈 열흘 전 부하 테스트에서 파드가 OOM으로 죽었다. 이 글은 그날 뭐가 터졌고 어떻게 고쳤는지 기록이다.

## 계산은 8월에 이미 해놨었다

설계 단계에서 숫자를 한 번 적어봤었다. 캐릭터 이동(MOVE)은 인당 초당 5건으로 제한. 500명이면 초당 2,500건이 들어온다. 이걸 접속자 전원에게 쏘면 2,500 × 500 = **초당 125만 메시지**.

그때 결론은 "실제 트래픽은 훨씬 낮을 테니 실측 먼저"였다. 경고는 했는데 대응을 미룬 셈이다. 한 달 뒤에 그대로 맞았다.

## 9월 2일, 미러 환경

봇 500마리 붙이고 이동 주기를 200ms로 올렸다. 결과:

- 접속 봇 435 중 첫 문제를 받은 봇은 233. **46%가 문제 자체를 못 받았다.** 세션별 송신 버퍼가 256개 넘치면 오래된 것부터 버리는 설정이었는데, 라운드당 한 번뿐인 QUESTION 프레임이 MOVE 더미에 밀려 떨어진 거였다.
- 메모리가 계속 올라가다 파드 두 대가 OOMKilled. 비정상 종료 352건. 게임은 시작도 못 했다.
- 관전자로 들어간 브라우저 탭도 `ERR_OUT_OF_MEMORY`로 죽었다. 관전자는 그룹이 없어서 500명 전원의 좌표를 받고 있었다.

OOM 자체는 설정 불일치가 직접 원인이었다. 컨테이너 limit은 2Gi인데 시작 스크립트 기본값이 `-Xmx4g`. 이건 `-XX:MaxRAMPercentage=70`으로 바꿔서 끝. 근데 그걸로 끝이 아니었다. 파드를 늘려도 **이미 붙어 있는 WebSocket 세션은 재분배되지 않고**, 각 파드가 Pub/Sub으로 전체 메시지를 다 받으니 팬아웃 총량은 그대로다.

숫자를 다시 적었다.

| | |
|---|---|
| 참가자 500 × MOVE 초당 5건 | 인바운드 초당 2,500건 |
| 각 MOVE가 583세션(참가 500 + 관전 83)에 전파 | **초당 145만 프레임** |

그런데 프론트 코드를 열어보니 화면에는 **자기 그룹 20명만** 그리고 있었다. 주석에 그렇게 적혀 있더라. 145만 프레임 중 96%는 받자마자 버려지는 거였다.

## 두 가지 안

Claude Code한테 던졌더니 처음엔 핸들러에서 거르는 안을 권했다. MOVE에 발신자 그룹 번호를 실어서, 세션마다 "내 그룹이 아니면 드롭". 변경은 작다. 근데 Redis에서 인스턴스로 오는 전달량과 세션별 비교 비용은 그대로 남는다.

내 대답은 "아니야, 그룹별 브로드캐스팅을 적용해. 너무 불필요하게 많이 쏨. 프론트가 수정해야 될 게 있으면 수정하라고 하면 되지."

그래서 채널을 쪼갰다.

## 채널 두 계층

```
quiz:game:{gameId}                 전체 — QUESTION, REVEAL, 존 카운트, 종료
quiz:game:{gameId}:group:{groupNo} 그룹 — MOVE, CHAT, EMOTE, 입퇴장
```

고빈도 프레임은 전부 그룹 채널로. 저빈도에 전원이 봐야 하는 것만 전체 채널로.

그룹은 서버가 정한다. 입장할 때 Lua 스크립트 하나가 "가장 낮은 번호의 미만원 그룹"에 넣고, 게임 시작 시점에 마지막 그룹이 절반 이하면 나머지에 라운드로빈으로 병합한 뒤 확정. 이후엔 안 바뀐다. 관전자는 기본 0번 그룹을 보고, 보고 싶은 그룹을 바꿀 수 있다.

![인스턴스 하나가 Redis 채널을 한 번만 구독하고 그걸 내부 세션들에 나눠주는 구조도](/images/one-subscription-per-instance.jpg)
<!-- IMAGE-PROMPT: Minimal diagram illustration: on the left a single red cylinder labeled only with a lightning icon (a message broker), one thin line going to a rounded rectangle (a server), and inside that rectangle the line fans out to many small circles (client sessions). Emphasize that only one line crosses from the cylinder to the rectangle. Flat design, soft blue and gray palette, white background, no readable text, 16:9. -->

인스턴스 쪽에서 중요한 게 하나 더 있다. Redis 구독을 **세션마다 하지 않는다.** 채널당 공유 Flux를 하나만 만들고 `share()`로 로컬 세션들이 나눠 쓴다. 첫 세션이 붙을 때 SUBSCRIBE, 마지막 세션이 떠날 때 UNSUBSCRIBE. WebSocket 연결이 5,000개여도 Redis 구독 수는 인스턴스 수에 비례한다. 세션은 `switchMap`으로 그룹이 바뀌면 구독을 갈아탄다.

## 결과

| | 전 | 후 |
|---|---|---|
| MOVE | 초당 145만 | 초당 5만 (2,500 × 20) |
| CHAT | 초당 2만 | 초당 700 |

약 29분의 1. 더 중요한 건 **세션당 수신량이 인원수와 무관한 상수**가 됐다는 거다. 그룹 20명 × 초당 5건 = 초당 100프레임. 전체 팬아웃이 O(N²)에서 O(N)으로.

다음 날 파드 한 대로 500명 12라운드 완주. 라운드마다 QUESTION 수신 수가 접속 수와 정확히 같았다. 그룹 크기는 나중에 30으로 올렸는데 Redis 부하는 거의 안 변했다. 발행 1건당 전달 수의 상한이 파드 수라서 그렇다. 늘어나는 건 인스턴스 안에서 로컬 세션에 쓰는 양뿐.

## 방을 쪼개지 않고 화면을 쪼갠 이유

처음 기획엔 "20명짜리 가상 방 25개"가 있었다. 팬아웃 감소 효과는 똑같은데 그걸 버린 이유는, 방 분할은 **게임 상태**를 쪼개는 거고 렌더 그룹은 **화면 구독 범위**만 쪼개는 거라서다. 상태를 쪼개면 방별 타이머 드리프트, 정원 이중 장부, 정산 때 방 횡단 집계, 관전 이동 시 상태 이전이 전부 따라온다. 구독 범위만 쪼개면 게임은 여전히 하나다.

## 남은 것

- MOVE 전용 토큰버킷은 나중에 초당 10건으로 올렸다. 프론트 전송 주기 100ms에 맞추려고. 그러면 최악치는 초당 10만 프레임이다. 위 표의 5만은 초당 5건 전제라는 걸 적어둔다.
- 운영 첫날 "채팅이 조용히 멈춘다"는 제보가 왔다. 공유 Flux가 complete로 끝나면 핑만 오가는 좀비 세션이 되는 경우. complete를 에러로 바꿔 세션을 닫게 해서 클라이언트가 재접속하도록 고쳤다.
- 8월에 적어둔 숫자를 8월에 믿었으면 9월 2일은 없었을 거다.
