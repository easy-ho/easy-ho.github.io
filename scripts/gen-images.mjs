// 포스트의 이미지 placeholder를 찾아 OpenAI 이미지 API로 생성하고, 줄여서 public/images/에 넣고, 블록을 ![]()로 교체한다.
// 사용: OPENAI_API_KEY=... node scripts/gen-images.mjs [--dry] [slug-substring]
// 키는 셸 환경변수로만 받는다. 저장소에 쓰지 않는다.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const dry = process.argv.includes('--dry');
const filter = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? '';
const key = process.env.OPENAI_API_KEY;
if (!key && !dry) { console.error('OPENAI_API_KEY가 없다. --dry로 목록만 볼 수 있다.'); process.exit(1); }
const dir = 'src/content/blog';
const re = /<figure class="img-placeholder">\s*<p><strong>[^<]*<\/strong>\s*—\s*([^<]*)<\/p>\s*<p><strong>프롬프트:<\/strong>\s*([\s\S]*?)<\/p>\s*<!-- IMAGE: ([\w.-]+) -->\s*<\/figure>/g;
for (const f of readdirSync(dir).filter((f) => f.endsWith('.md') && f.includes(filter))) {
	let md = readFileSync(`${dir}/${f}`, 'utf8'), changed = false;
	for (const m of md.matchAll(re)) {
		const [block, alt, prompt, name] = m;
		const base = name.replace(/\.\w+$/, ''), out = `public/images/${base}.jpg`;
		console.log(`${f} → ${base}${dry ? ' (dry)' : ''}`);
		if (dry) continue;
		if (!existsSync(out)) {
			const res = await fetch('https://api.openai.com/v1/images/generations', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gpt-image-1', prompt: prompt.trim(), size: '1536x1024', quality: 'medium' }) });
			if (!res.ok) { console.error(await res.text()); continue; }
			const { data } = await res.json();
			const png = `/tmp/${base}.png`; writeFileSync(png, Buffer.from(data[0].b64_json, 'base64'));
			execFileSync('sips', ['-Z', '1320', '-s', 'format', 'jpeg', '-s', 'formatOptions', '85', png, '--out', out], { stdio: 'ignore' });
		}
		md = md.replace(block, `![${alt.trim()}](/images/${base}.jpg)`); changed = true;
	}
	if (changed) writeFileSync(`${dir}/${f}`, md);
}
