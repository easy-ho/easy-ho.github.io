## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## 이 블로그의 규칙

- 블로그 이름/소개는 `src/consts.ts` 한 곳에서만 바꾼다. GitHub 링크는 두지 않는다.
- 포스트는 `src/content/blog/YYYY-MM-DD-slug.md`. frontmatter는 `title`, `description`, `pubDate` 필수.
- 이미지 자리는 아래 블록으로 비워둔다. 이미지가 생기면 원본을 `sips -Z 1320` JPEG(품질 85)로 줄여 `public/images/`에 넣고, placeholder 블록(프롬프트 포함)을 통째로 `![설명](/images/파일명.jpg)`으로 바꾼다.
  ```html
  <figure class="img-placeholder">
    <p><strong>🖼️ 이미지 자리 #N</strong> — 한 줄 설명</p>
    <p><strong>프롬프트:</strong> 영어 생성 프롬프트</p>
    <!-- IMAGE: 파일명.png -->
  </figure>
  ```
- 회사 서비스명·내부 URL·수치·사람 이름은 싣지 않는다. 기술 내용만 익명화해서 쓴다.
- 설정 파일(YAML)·시크릿·크리덴셜·운영 로그를 AI에 붙여넣거나 읽혔다는 서술은 쓰지 않는다. 코드 분석에 AI를 쓴 이야기 자체는 괜찮다.
- 말투: 반말 일기체("~했다", "~더라", "~인 듯"). 1인칭, 짧은 문장. "~습니다"체 금지.
- Claude는 도구로만 가볍게 언급한다. "Claude가 ~했습니다" 식 3인칭 서술 금지. 내가 한 작업이 주인공.
- 디자인: 미니멀 텍스트 중심. 본문 폭 660px, Pretendard, 장식 없음. 카드·히어로 이미지·그라데이션 추가 금지.
- 커밋은 이 저장소의 로컬 git 설정(EasyHo / dev.easyho@gmail.com)으로만 한다. 전역 설정을 바꾸지 않는다.

- 포스트 frontmatter에 `category`(카드팩 단위)를 넣는다. `grade`(C/R/SR/SSR)는 생략하면 자동 산정.
- `/sea/`(src/pages/sea.astro): 첫 섬에서 출항해 시간순으로 섬(다녀온 회사, 익명)에 닿는 항해. 가치관 유리병은 `values` 배열(항로 구간 위 위치), 글은 지금 섬 앞바다의 일지 병으로 자동. 선실: `public/cv.pdf`를 두면 이력서 버튼이 생긴다(실명·전화번호 없는 판으로). 읽는 책은 `captain.reading`에 적으면 보인다. 홈·소개의 한 줄 링크로만 노출한다.
- 이미지 자리 채우기: `node scripts/gen-images.mjs [slug]`가 placeholder 프롬프트로 Codex CLI(`codex exec`, 로그인돼 있어야 함) 이미지 생성 → 1320px JPEG → `public/images/` → 블록을 `![]()`로 교체(프롬프트 주석은 남기지 않는다)(`--dry`로 목록만). Claude가 SVG로 직접 그리는 건 하지 않는다(품질 거부됨).
