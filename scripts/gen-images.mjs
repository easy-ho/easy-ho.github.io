// 포스트의 이미지 placeholder를 찾아 Codex CLI로 이미지를 생성하고, 1320px JPEG로 줄여 public/images/에 넣고, 블록을 ![]()로 교체한다.
// 사용: node scripts/gen-images.mjs [--dry] [slug-substring]   (codex 로그인 필요)
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const dry = process.argv.includes('--dry');
const filter = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? '';
const dir = 'src/content/blog', tmp = resolve('.gen-images'); mkdirSync(tmp, { recursive: true });
const re = /<figure class="img-placeholder">\s*<p><strong>[^<]*<\/strong>\s*—\s*([^<]*)<\/p>\s*<p><strong>프롬프트:<\/strong>\s*([\s\S]*?)<\/p>\s*<!-- IMAGE: ([\w.-]+) -->\s*<\/figure>/g;
for (const f of readdirSync(dir).filter((f) => f.endsWith('.md') && f.includes(filter))) {
	let md = readFileSync(`${dir}/${f}`, 'utf8');
	for (const m of [...md.matchAll(re)]) {
		const [block, alt, prompt, name] = m;
		const base = name.replace(/\.\w+$/, ''), png = `${tmp}/${base}.png`, out = `public/images/${base}.jpg`;
		console.log(`${f} → ${base}${dry ? ' (dry)' : ''}`);
		if (dry) continue;
		if (!existsSync(out)) {
			const ask = `${prompt.trim()}\n\nGenerate this as a real raster image with your image generation tool (do not draw it with code or SVG). Save the PNG exactly at ${png}. Reply DONE when the file exists.`;
			try { execFileSync('codex', ['exec', '--skip-git-repo-check', '-s', 'workspace-write', '-C', tmp, ask], { stdio: ['ignore', 'ignore', 'inherit'], timeout: 10 * 60 * 1000 }); } catch (e) { console.error(`codex 실패: ${base}`); }
			if (!existsSync(png)) { console.error(`파일 없음: ${png}`); continue; }
			execFileSync('sips', ['-Z', '1320', '-s', 'format', 'jpeg', '-s', 'formatOptions', '85', png, '--out', out], { stdio: 'ignore' });
		}
		md = md.replace(block, `![${alt.trim()}](/images/${base}.jpg)`);
		writeFileSync(`${dir}/${f}`, md);
		console.log(`  ✓ ${out}`);
	}
}
