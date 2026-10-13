import { execSync } from 'node:child_process';

const run = (cmd: string) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

export type Commit = {
	sha: string; short: string; date: string; msg: string;
	files: { status: string; path: string }[];
};

/** 저장소 전체 커밋, 오래된 순. */
export function commits(): Commit[] {
	const raw = run(`git log --reverse --format='%x1e%H%x1f%h%x1f%aI%x1f%s' --name-status`);
	return raw.split('\x1e').filter(Boolean).map((chunk) => {
		const [head, ...rest] = chunk.split('\n');
		const [sha, short, date, msg] = head.split('\x1f');
		const files = rest.filter((l) => /^[AMDR]/.test(l)).map((l) => {
			const parts = l.split('\t');
			return { status: parts[0][0], path: parts[parts.length - 1] };
		});
		return { sha, short, date, msg, files };
	});
}

export function showFile(sha: string, path: string): string | null {
	try { return run(`git show ${sha}:'${path}'`); } catch { return null; }
}

export function numstat(sha: string, path: string): { add: number; del: number } {
	try {
		const [a, d] = run(`git show --numstat --format= ${sha} -- '${path}'`).trim().split('\t');
		return { add: +a || 0, del: +d || 0 };
	} catch { return { add: 0, del: 0 }; }
}

export function titleOf(md: string | null): string {
	const m = md?.match(/^title:\s*['"]?(.*?)['"]?\s*$/m);
	return m ? m[1] : '';
}

export function stripFrontmatter(md: string): string {
	return md.replace(/^---[\s\S]*?---\n/, '').replace(/\n+$/, '');
}

/** 파일 하나의 리비전 목록(오래된 순). 삭제된 시점은 건너뜀. */
export function fileHistory(path: string) {
	const shas = run(`git log --reverse --format='%H %h %aI' -- '${path}'`).trim().split('\n');
	return shas.map((line) => {
		const [sha, short, date] = line.split(' ');
		const msg = run(`git log -1 --format=%s ${sha}`).trim();
		return { sha, short, date, msg, content: showFile(sha, path) };
	}).filter((r) => r.content !== null) as { sha: string; short: string; date: string; msg: string; content: string }[];
}

export function buildInfo() {
	const sha = process.env.GITHUB_SHA ?? run('git rev-parse HEAD').trim();
	return {
		sha, short: sha.slice(0, 7),
		runId: process.env.GITHUB_RUN_ID ?? null,
		runNumber: process.env.GITHUB_RUN_NUMBER ?? null,
		builtAt: new Date().toISOString(),
		runner: process.env.RUNNER_OS ?? process.platform,
		node: process.version,
	};
}

/** 줄 단위 LCS diff. 결과: [type, line][] (type: ' ' | '-' | '+') */
export function lineDiff(a: string[], b: string[]): [string, string][] {
	const n = a.length, m = b.length;
	const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
	for (let i = n - 1; i >= 0; i--)
		for (let j = m - 1; j >= 0; j--)
			dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
	const out: [string, string][] = [];
	let i = 0, j = 0;
	while (i < n && j < m) {
		if (a[i] === b[j]) { out.push([' ', a[i]]); i++; j++; }
		else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push(['-', a[i]]); i++; }
		else { out.push(['+', b[j]]); j++; }
	}
	while (i < n) out.push(['-', a[i++]]);
	while (j < m) out.push(['+', b[j++]]);
	return out;
}
