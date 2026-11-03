// 블로그 이름/소개는 여기서만 바꾸면 전체에 반영됩니다.
export const SITE_TITLE = 'easyho.log';
export const SITE_DESCRIPTION = '백엔드 개발자의 작업 기록';

// 카테고리 → URL 슬러그. 여기 없는 카테고리는 이름을 그대로 인코딩해 쓴다. 순서는 목록 표시 순서.
export const CATEGORY_SLUGS: Record<string, string> = {
	'백엔드': 'backend',
	'실시간 서버': 'realtime',
	'인프라': 'infra',
	'Claude Code': 'claude-code',
};
export const categorySlug = (name: string) => CATEGORY_SLUGS[name] ?? encodeURIComponent(name);
export const categoryOrder = (name: string) => {
	const i = Object.keys(CATEGORY_SLUGS).indexOf(name);
	return i === -1 ? 99 : i;
};
