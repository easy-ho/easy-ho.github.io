---
title: 'Claude Code로 GitHub Pages 블로그를 만든 과정 (이 블로그 이야기)'
description: '터미널에서 "블로그 만들어줘" 한 마디로 시작해 Astro + GitHub Actions 배포까지, 이 블로그가 만들어진 세션을 그대로 기록합니다.'
pubDate: '2026-10-12'
---

<figure class="img-placeholder">
  <p><strong>🖼️ 이미지 자리 #1 (히어로)</strong> — 터미널 창에서 블로그가 자라나는 느낌의 일러스트</p>
  <p><strong>프롬프트:</strong> A minimalist flat illustration of a dark terminal window on a desk, with a small plant sprouting out of the cursor line and growing into a tiny website page with a header and three post cards. Soft pastel palette, clean vector style, no text, 16:9.</p>
  <!-- IMAGE: hero-terminal-sprout.png -->
</figure>

이 블로그의 첫 글은 블로그 자체가 어떻게 만들어졌는지에 대한 이야기입니다. 저는 터미널에서 Claude Code에게 이렇게 말했습니다.

> 클로드로 뭔가 유용한 걸 만들어보고 싶은데, 뭘 만들 수 있을까? 내 개인 블로그를 만들어서 클로드 세션 기반으로 개발 포스팅을 작성해줘. 이미지가 들어갈 자리들은 비워놓고 이미지 생성 프롬프트를 써서 넣어놔줘.

그리고 이 글을 포함한 첫 포스팅들이 한 세션 안에서 나왔습니다. 이 글은 그 세션에서 실제로 일어난 일을 순서대로 정리한 것입니다.

## 1. 뭘 물어보기 전에 환경부터 확인

제가 "뭘 알려주면 돼?"라고 물었을 때 Claude가 먼저 한 일은 질문이 아니라 **로컬 환경 점검**이었습니다.

```
git 2.49 / Node 22 / npm 10  → 있음
gh CLI                       → 없음
Ruby                          → 시스템 기본 2.6 (Jekyll 쓰기엔 번거로움)
~/.claude/projects/           → 세션 로그 수십 개 (포스팅 소재)
```

이 결과를 근거로 Jekyll이 아니라 **Astro**를 추천받았습니다. Node가 이미 있으니 로컬 미리보기가 바로 되고, Ruby 버전 관리를 안 해도 된다는 이유였습니다. 저는 "뭐가 됐든 github.io 주소로 되면 된다"는 입장이라 그대로 따랐습니다.

## 2. 계정 분리라는 제약

여기서 제가 한 가지 조건을 걸었습니다. 회사 업무용 git 계정과 개인 블로그 계정이 **절대 섞이면 안 된다**는 것이었습니다. 로컬 git의 전역 설정에는 회사 이메일이 들어 있었기 때문입니다.

Claude가 확인한 것들:

- 기존 SSH 키나 키체인에 GitHub 자격증명이 남아 있는지 → 없음
- 워크스페이스 안의 저장소 원격 주소가 어디를 보는지 → 거의 전부 사내 GitLab, GitHub는 공개 저장소 클론 하나뿐
- `~/.config/gh`가 이미 있는지 → 없음

그리고 분리 방식으로 다음을 적용했습니다.

```bash
# 블로그 저장소에서만 유효한 로컬 설정 (전역은 건드리지 않음)
git config user.name  "EasyHo"
git config user.email "dev.easyho@gmail.com"
git config credential.helper "!gh auth git-credential"
```

전역 설정을 바꾸는 대신 저장소 로컬 설정만 쓰고, gh CLI 자격증명도 이 저장소의 credential helper로만 연결했습니다. 사내 GitLab 저장소들은 호스트가 다르니 영향이 없습니다.

<figure class="img-placeholder">
  <p><strong>🖼️ 이미지 자리 #2</strong> — 두 개의 계정이 서로 다른 문으로 들어가는 분리 개념도</p>
  <p><strong>프롬프트:</strong> Simple diagram-style illustration: two doors side by side on a flat wall, left door labeled with a briefcase icon leading to a GitLab-like orange fox silhouette, right door labeled with a house icon leading to a GitHub-like cat silhouette. A clear vertical divider between them. Flat vector, muted colors, no readable text.</p>
  <!-- IMAGE: account-separation.png -->
</figure>

## 3. 골격 생성과 템플릿 정리

Astro 공식 블로그 템플릿으로 시작했습니다.

```bash
npm create astro@latest -- blog --template blog --install --no-git --yes
```

템플릿에는 Astro 홍보용 링크(Mastodon, Twitter)와 Lorem ipsum이 가득했습니다. Claude가 한 정리:

- 헤더/푸터의 소셜 링크를 GitHub 하나로 축소
- `lang="en"` → `lang="ko"`
- 샘플 포스트 5개와 플레이스홀더 이미지 삭제
- 블로그 이름과 소개를 상수 파일 한 곳으로 모음 (나중에 이름을 바꾸면 여기만 수정)

블로그 이름은 "적당히 지어줘"라고 했더니 `easyho.log`가 나왔습니다. 마음에 안 들면 상수 파일 한 줄만 고치면 됩니다.

## 4. 이미지 자리와 프롬프트 규칙

제 요청 중 핵심은 "이미지 자리를 비워두고 프롬프트를 적어달라"였습니다. Claude가 만든 규칙은 이렇습니다.

```html
<figure class="img-placeholder">
  <p><strong>🖼️ 이미지 자리 #1</strong> — 한 줄 설명</p>
  <p><strong>프롬프트:</strong> 영어 생성 프롬프트</p>
  <!-- IMAGE: 파일명.png -->
</figure>
```

- 배포된 사이트에서도 점선 박스로 **보이게** 둡니다. 나중에 어느 자리가 비었는지 바로 알 수 있습니다.
- 프롬프트는 영어로 씁니다. 이미지 생성 모델이 영어에 더 안정적이기 때문입니다.
- 주석의 파일명은 이미지를 만든 뒤 `![설명](/images/파일명.png)`으로 교체할 때 쓰는 약속입니다.

## 5. 배포는 GitHub Actions

`withastro/action` 같은 래퍼 대신, 버전이 확실한 공식 액션만 조합했습니다.

```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with: { node-version: 22, cache: npm }
- run: npm ci
- run: npm run build
- uses: actions/upload-pages-artifact@v3
  with: { path: dist }
# ...
- uses: actions/deploy-pages@v4
```

저장소 이름을 `<아이디>.github.io`로 만들고 Pages 소스를 "GitHub Actions"로 두면, `main`에 push할 때마다 자동 배포됩니다.

## 6. 포스팅 소재 고르기

세션 로그를 훑으면서 Claude가 스스로 세운 기준이 있었습니다.

1. **회사 서비스명, 내부 URL, 수치, 사람 이름은 싣지 않는다.** 실제로 로그에는 사내 도메인과 팀원 이름이 섞여 있었고, 그런 세션은 소재에서 제외하거나 기법만 추렸습니다.
2. **다시 봐도 쓸모 있는 것**을 고른다. 일회성 질의응답보다 재사용되는 스킬, 방법론, TIL 위주.

그렇게 고른 첫 글 세 편이 이 글과 함께 올라갑니다.

<figure class="img-placeholder">
  <p><strong>🖼️ 이미지 자리 #3</strong> — 수많은 세션 로그 중 몇 개만 골라내는 체 모양의 개념도</p>
  <p><strong>프롬프트:</strong> Flat illustration of a funnel or sieve: many small gray document icons pouring in from the top, only three glowing document icons coming out the bottom onto a small notebook. Clean vector style, soft blue and amber accents, no text.</p>
  <!-- IMAGE: session-sieve.png -->
</figure>

## 느낀 점

- "뭘 만들까"를 고민하는 시간이 가장 길었고, 만드는 시간은 짧았습니다. 요구사항 두세 줄이면 충분했습니다.
- 계정 분리처럼 **내가 명시한 제약을 먼저 검증하고 시작**한 점이 좋았습니다. 그냥 전역 설정을 덮어썼다면 사내 저장소 커밋에 개인 이메일이 섞일 뻔했습니다.
- 다음 할 일은 명확합니다. 이 글의 이미지 자리 세 개를 채우는 것.
