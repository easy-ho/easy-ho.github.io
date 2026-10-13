---
title: '블로그를 하루 만에 만들었다'
description: 'Astro + GitHub Pages로 블로그 세팅한 기록. 업무 계정이랑 섞이지 않게 분리하는 게 제일 신경 쓰였다.'
pubDate: '2026-10-12'
---

<figure class="post-img">
  <img src="/images/hero-terminal-sprout.svg" alt="터미널에서 블로그가 자라나는 느낌의 일러스트" loading="lazy" />
  <figcaption>터미널에서 블로그가 자라나는 느낌의 일러스트<details><summary>프롬프트</summary>A minimalist flat illustration of a dark terminal window on a desk, with a small plant sprouting out of the cursor line and growing into a tiny website page with a header and three post cards. Soft pastel palette, clean vector style, no text, 16:9.</details></figcaption>
  <!-- IMAGE: hero-terminal-sprout.svg -->
</figure>

예전부터 블로그 하나 있어야지 생각만 하고 있었다. 매번 "뭘로 만들지"에서 막혔다. Jekyll? Hugo? 테마 고르다가 지쳐서 끝. 이번엔 그냥 Claude Code 켜놓고 "블로그 만들어줘"라고 했다. 하루 만에 끝났다.

## 뭘로 만들었나

**Astro + GitHub Pages.**

처음엔 github.io니까 당연히 Jekyll인가 했는데, 내 맥에 깔린 Ruby가 시스템 기본 2.6이라 로컬 미리보기부터 번거로웠다. Node는 22가 이미 있었고. Astro는 npm 하나로 끝나고 마크다운 그대로 쓰면 되니까 이쪽으로.

```bash
npm create astro@latest -- blog --template blog --install --no-git --yes
```

공식 블로그 템플릿으로 시작했는데, 기본 상태가 좀 심했다. Astro 홍보 링크(Mastodon, Twitter), Lorem ipsum, 거대한 제목 폰트. 전부 걷어냈다. 지금 보고 있는 이 디자인은 두 번째 버전이다. 첫 버전 올리고 들어가 봤더니 영 아니어서 다 뜯어고쳤다.

## 제일 신경 쓴 것: 계정 분리

회사에서도 git을 쓰니까, 전역 git 설정에 회사 이메일이 들어 있다. 블로그 커밋에 회사 이메일이 찍히거나, 반대로 회사 저장소에 개인 계정이 섞이면 곤란하다.

그래서 전역 설정은 안 건드리고 **블로그 저장소에만 로컬 설정**을 넣었다.

```bash
git config user.name  "EasyHo"
git config user.email "dev.easyho@gmail.com"
git config credential.helper "!gh auth git-credential"
```

gh CLI 자격증명도 이 저장소의 credential helper로만 연결. 회사 저장소는 전부 사내 GitLab이라 호스트가 달라서 애초에 겹칠 일이 없긴 한데, 그래도 확실히 해두는 게 마음 편하다.

<figure class="post-img">
  <img src="/images/account-separation.svg" alt="두 개의 계정이 서로 다른 문으로 들어가는 분리 개념도" loading="lazy" />
  <figcaption>두 개의 계정이 서로 다른 문으로 들어가는 분리 개념도<details><summary>프롬프트</summary>Simple diagram-style illustration: two doors side by side on a flat wall, left door with a briefcase icon leading to an orange fox silhouette, right door with a house icon leading to a black cat silhouette. A clear vertical divider between them. Flat vector, muted colors, no readable text.</details></figcaption>
  <!-- IMAGE: account-separation.svg -->
</figure>

## gh 로그인에서 삽질

여기서 시간을 제일 많이 썼다.

1. `gh auth login`을 Claude Code 안에서 돌리니까 브라우저 인증 코드 입력 단계에서 끊김. 대화형 프롬프트는 이 안에서 안 된다.
2. 백그라운드로 띄워서 코드만 받아 브라우저에 넣는 식으로 했는데, 로그인은 됐지만 push가 거부됨. `workflow` 스코프가 없어서 Actions 워크플로우 파일을 올릴 수 없다는 거였다.
3. `gh auth refresh -s workflow`로 스코프 추가. 근데 코드 유효시간이 15분이라 두 번 만료시켰다. 세 번째에 성공.

결론: **gh 로그인은 그냥 별도 터미널에서 직접 하자.** 그리고 처음부터 `-s workflow` 붙여서.

```bash
gh auth login -h github.com -p https -w -s workflow
```

## 배포

`withastro/action` 같은 래퍼 안 쓰고 공식 액션만 조합했다. 버전이 확실한 게 좋다.

```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with: { node-version: 22, cache: npm }
- run: npm ci
- run: npm run build
- uses: actions/upload-pages-artifact@v3
  with: { path: dist }
- uses: actions/deploy-pages@v4
```

저장소 이름을 `<아이디>.github.io`로, Pages 소스를 "GitHub Actions"로. main에 push하면 1분쯤 뒤에 올라간다.

## 이미지는 나중에

글에 그림을 넣고 싶은데 지금 당장 만들 시간은 없다. 그래서 자리만 비워두고 프롬프트를 적어두기로 했다. 이 글 위아래에 있는 점선 박스가 그거다. 나중에 이미지 생성해서 채우면 된다. 배포된 사이트에서도 보이게 둔 건 의도한 거다. 어디가 비었는지 바로 보이니까.

<figure class="post-img">
  <img src="/images/session-sieve.svg" alt="수많은 세션 로그 중 몇 개만 골라내는 체 모양의 개념도" loading="lazy" />
  <figcaption>수많은 세션 로그 중 몇 개만 골라내는 체 모양의 개념도<details><summary>프롬프트</summary>Flat illustration of a funnel or sieve: many small gray document icons pouring in from the top, only three glowing document icons coming out the bottom onto a small notebook. Clean vector style, soft blue and amber accents, no text.</details></figcaption>
  <!-- IMAGE: session-sieve.svg -->
</figure>

## 글감

Claude Code 세션 로그가 수십 개 쌓여 있어서, 거기서 다시 봐도 쓸모 있을 것만 골랐다. 회사 서비스명이나 내부 URL, 사람 이름이 섞인 건 빼거나 기법만 추렸다. 첫 글 세 개가 그렇게 나왔다.

다음 할 일은 이 글의 이미지 세 개 채우기.
