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

- 블로그 이름/소개/GitHub 링크는 `src/consts.ts` 한 곳에서만 바꾼다.
- 포스트는 `src/content/blog/YYYY-MM-DD-slug.md`. frontmatter는 `title`, `description`, `pubDate` 필수.
- 이미지 자리는 아래 블록으로 비워두고, 이미지가 생기면 `![설명](/images/파일명.png)`으로 교체한다.
  ```html
  <figure class="img-placeholder">
    <p><strong>🖼️ 이미지 자리 #N</strong> — 한 줄 설명</p>
    <p><strong>프롬프트:</strong> 영어 생성 프롬프트</p>
    <!-- IMAGE: 파일명.png -->
  </figure>
  ```
- 회사 서비스명·내부 URL·수치·사람 이름은 싣지 않는다. 기술 내용만 익명화해서 쓴다.
- 커밋은 이 저장소의 로컬 git 설정(EasyHo / dev.easyho@gmail.com)으로만 한다. 전역 설정을 바꾸지 않는다.
