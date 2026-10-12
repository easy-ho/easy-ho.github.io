---
title: 'TIL: Deployment에 붙어 있던 정체불명의 schedule-actions 어노테이션'
description: 'Rancher 화면에서 본 Deployment 어노테이션의 정체는 kube-schedule-scaler였습니다. HPA의 min/max를 크론으로 바꾸는 방식과 확인해야 할 함정.'
pubDate: '2026-09-12'
---

<figure class="img-placeholder">
  <p><strong>🖼️ 이미지 자리 #1 (히어로)</strong> — 시계와 파드 개수가 연결된 스케줄 스케일링 개념</p>
  <p><strong>프롬프트:</strong> Flat vector illustration of an analog clock on the left, with three arrows at different hour marks pointing to the right toward stacks of small hexagonal pods that grow in height from 2 to 7 to 10 and then shrink back. Soft blue and gray palette, white background, no readable text, 16:9.</p>
  <!-- IMAGE: schedule-scaler-hero.png -->
</figure>

라이브 이벤트 전 운영 환경 Deployment를 Rancher에서 보다가, 처음 보는 어노테이션을 발견했습니다. Rancher 기본 기능인지, 누가 수동으로 넣은 건지 알 수 없었습니다. YAML을 통째로 Claude Code에 붙여넣고 "이게 뭐냐"고 물었습니다.

## 정체: kube-schedule-scaler

Rancher 자체 기능이 아니라 클러스터에 설치된 **kube-schedule-scaler**(zalando-incubator)가 읽는 어노테이션이었습니다. 동작 방식은 이렇습니다.

- 크론 스케줄에 맞춰 **같은 이름의 HPA**의 `minReplicas` / `maxReplicas`를 바꾼다
- Deployment의 `replicas`를 직접 건드리는 게 아니다
- 실제 파드 수는 HPA가 그 범위 안에서 지표를 보고 결정한다

즉 "이 시각에 파드 N개"가 아니라 "이 시각부터 HPA 범위를 [min, max]로"입니다. 이 차이가 중요합니다.

## 설정 해석

이벤트 날짜(매월 특정 날짜 묶음) 저녁에 두 단계로 선제 확장하고, 끝나면 되돌리는 구조였습니다. 크론 시각은 스케일러 파드의 시간대 기준이라, 컨테이너 기본값인 UTC라면 KST로 +9시간입니다.

| 크론(UTC 가정) | KST | HPA min | HPA max | 효과 |
|---|---|---|---|---|
| 11:10 | 20:10 | 7 | 10 | 즉시 최소 7개로 확장 |
| 11:20 | 20:20 | 10 | 15 | 최소 10개, 부하 시 15개까지 |
| 12:30 | 21:30 | 2 | 10 | 최소치 해제, HPA가 점진 축소 |

12:30 이후에는 HPA의 축소 안정화 시간(기본 5분)이 지나고 CPU 지표가 내려가는 만큼 줄어들어 결국 2개로 돌아갑니다.

<figure class="img-placeholder">
  <p><strong>🖼️ 이미지 자리 #2</strong> — 시간축에 따라 HPA min/max 범위가 계단식으로 바뀌는 그래프</p>
  <p><strong>프롬프트:</strong> Minimal line chart illustration: x-axis is time, a shaded band shows a min/max range that steps up twice in the evening and then drops back, with a thin line inside the band representing actual pod count following the lower bound. Flat design, blue band, white background, no readable axis labels.</p>
  <!-- IMAGE: hpa-range-steps.png -->
</figure>

## 확인해야 할 함정

Claude가 답변 끝에 붙인 "확인 필요" 항목이 실제로 더 유용했습니다.

1. **같은 이름의 HPA가 있어야 동작한다.** 어노테이션만 있고 HPA가 없으면 아무 일도 안 일어납니다. `managedFields`에 kube-controller-manager가 scale 서브리소스로 replicas를 갱신한 기록이 있어서 HPA는 있는 것으로 보였지만, 직접 확인은 안 된 상태였습니다.
2. **시간대는 스케일러 배포의 TZ 환경변수에 달렸다.** UTC라고 단정하면 안 됩니다. 9시간 틀리면 이벤트 끝나고 확장됩니다.
3. **되돌리는 항목이 반드시 있어야 한다.** 스케줄로 바꾼 min/max는 자동으로 원복되지 않습니다. 12:30 항목이 그 역할인데, max가 10으로만 돌아갑니다. 원래 max가 15였다면 이 설정이 매번 max를 깎고 있는 셈입니다. HPA 원본을 봐야 합니다.
4. **노드 여유.** 직전에 파드 리소스 요청이 올라간 상태였습니다. 15개까지 늘면 노드그룹 전체에 필요한 CPU·메모리가 상당해서, 스케줄만 믿고 있다가 노드가 모자라 Pending이 나는 상황을 같이 봐야 했습니다.

## 정리

- 어노테이션 기반 설정은 "누가 읽는지"를 먼저 찾아야 한다. 이번엔 zalando-incubator의 kube-schedule-scaler였다.
- HPA 범위를 조정하는 방식이라, **HPA 존재 여부 / TZ / 원복 항목 / 노드 용량** 네 가지를 세트로 확인한다.
- YAML을 통째로 붙여넣고 묻는 건 생각보다 효율이 좋다. 모르는 어노테이션의 출처를 검색으로 찾는 것보다 빨랐고, "확인 필요" 목록까지 같이 나왔다.
