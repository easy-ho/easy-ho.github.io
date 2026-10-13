---
title: 'Deployment에 붙어 있던 정체불명의 어노테이션'
description: 'Rancher에서 본 schedule-actions 어노테이션의 정체는 kube-schedule-scaler. HPA min/max를 크론으로 바꾸는 방식이라 확인할 함정이 네 개 있다.'
pubDate: '2026-09-12'
---

<figure class="post-img">
  <img src="/images/schedule-scaler-hero.svg" alt="시계와 파드 개수가 연결된 스케줄 스케일링 개념" loading="lazy" />
  <figcaption>시계와 파드 개수가 연결된 스케줄 스케일링 개념<details><summary>프롬프트</summary>Flat vector illustration of an analog clock on the left, with three arrows at different hour marks pointing right toward stacks of small hexagonal pods that grow in height from 2 to 7 to 10 and then shrink back. Soft blue and gray palette, white background, no readable text, 16:9.</details></figcaption>
  <!-- IMAGE: schedule-scaler-hero.svg -->
</figure>

라이브 이벤트 전에 운영 Deployment를 Rancher에서 보다가 처음 보는 어노테이션을 발견했다. Rancher 기능인지, 누가 손으로 넣은 건지 모르겠어서 YAML 통째로 Claude Code에 붙여넣고 "이게 뭐냐"고 물어봤다.

## 정체: kube-schedule-scaler

Rancher 기능이 아니라 클러스터에 깔린 **kube-schedule-scaler**(zalando-incubator)가 읽는 어노테이션이었다.

- 크론 스케줄에 맞춰 **같은 이름의 HPA**의 `minReplicas` / `maxReplicas`를 바꾼다
- Deployment의 `replicas`를 직접 건드리는 게 아니다
- 실제 파드 수는 HPA가 그 범위 안에서 지표 보고 결정

"이 시각에 파드 N개"가 아니라 "이 시각부터 HPA 범위를 [min, max]로". 이 차이가 중요하다.

## 설정 읽어보니

이벤트 날짜(매월 특정 날짜 묶음) 저녁에 두 단계로 미리 늘리고, 끝나면 되돌리는 구조. 크론 시각은 스케일러 파드의 시간대 기준이라 컨테이너 기본값인 UTC면 KST +9.

| 크론(UTC 가정) | KST | min | max | 효과 |
|---|---|---|---|---|
| 11:10 | 20:10 | 7 | 10 | 바로 최소 7개로 |
| 11:20 | 20:20 | 10 | 15 | 최소 10개, 부하 시 15개까지 |
| 12:30 | 21:30 | 2 | 10 | 최소치 해제, HPA가 알아서 줄임 |

12:30 이후엔 HPA 축소 안정화 시간(기본 5분) 지나고 CPU 내려가는 만큼 줄어서 결국 2개로.

<figure class="post-img">
  <img src="/images/hpa-range-steps.svg" alt="시간축에 따라 HPA min/max 범위가 계단식으로 바뀌는 그래프" loading="lazy" />
  <figcaption>시간축에 따라 HPA min/max 범위가 계단식으로 바뀌는 그래프<details><summary>프롬프트</summary>Minimal line chart illustration: x-axis is time, a shaded band shows a min/max range that steps up twice in the evening and then drops back, with a thin line inside the band representing actual pod count following the lower bound. Flat design, blue band, white background, no readable axis labels.</details></figcaption>
  <!-- IMAGE: hpa-range-steps.svg -->
</figure>

## 확인해야 할 함정 네 개

답변 끝에 붙어 있던 "확인 필요" 목록이 사실 제일 쓸모 있었다.

1. **같은 이름의 HPA가 있어야 동작한다.** 어노테이션만 있고 HPA 없으면 아무 일도 안 일어난다. managedFields에 kube-controller-manager가 scale 서브리소스로 replicas 갱신한 흔적이 있어서 HPA는 있는 것 같았는데, 직접 확인은 안 한 상태.
2. **시간대는 스케일러 배포의 TZ에 달렸다.** UTC라고 단정하면 안 된다. 9시간 틀리면 이벤트 끝나고 늘어난다.
3. **되돌리는 항목이 꼭 있어야 한다.** 스케줄로 바꾼 min/max는 자동 원복 안 됨. 12:30 항목이 그 역할인데 max가 10으로만 돌아간다. 원래 max가 15였으면 이 설정이 매번 max를 깎고 있는 셈. HPA 원본 봐야 한다.
4. **노드 여유.** 직전에 파드 리소스 요청이 올라간 상태였다. 15개까지 늘면 노드그룹에 필요한 CPU·메모리가 꽤 돼서, 스케줄만 믿다가 노드 모자라서 Pending 나는 상황도 같이 봐야 했다.

## 정리

- 어노테이션 기반 설정은 "누가 읽는지"부터 찾는다. 이번엔 zalando-incubator의 kube-schedule-scaler.
- HPA 범위를 조정하는 방식이니까 **HPA 존재 / TZ / 원복 항목 / 노드 용량** 네 개를 세트로 확인.
- YAML 통째로 붙여넣고 묻는 게 생각보다 효율 좋다. 모르는 어노테이션 출처를 검색으로 찾는 것보다 빨랐고, "확인 필요" 목록까지 같이 나왔다.
