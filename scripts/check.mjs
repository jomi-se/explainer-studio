// Fast static checks, no browser needed (CI runs this first):
//   syntax       every .js/.mjs parses (node --check)
//   format       no tabs in code, no trailing whitespace, no CRLF, a final newline
//   determinism  scene code never touches clocks, randomness or CSS/Web animations
//                (the rules in CLAUDE.md; lint.mjs --determinism catches what slips past)
//
//   node scripts/check.mjs

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from './lib.mjs';

const SKIP = new Set(['node_modules', '.playwright', 'out', 'public', '.git', 'footage', 'audio']);
const TEXT = new Set(['.js', '.mjs', '.css', '.md', '.html', '.json', '.toml', '.yml']);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (TEXT.has(extname(name))) yield p;
  }
}

// Scene code is everything under projects/ that runs in the page (not the project's offline audio.js, and not
// content/ data files: on-screen text, where code callouts quote other code verbatim).
const BANNED = [
  [/\bMath\.random\s*\(/, 'Math.random — use rng(seed) from studio/motion.js'],
  [/\bDate\.now\s*\(|\bnew Date\s*\(/, 'Date — scenes are a function of t only'],
  [/\bperformance\.now\s*\(/, 'performance.now — scenes are a function of t only'],
  [/\b(setTimeout|setInterval|requestAnimationFrame)\s*\(/, 'timers — scenes are a function of t only'],
  [/\.animate\s*\(/, 'el.animate() — Web Animations run on a real clock'],
  // CSS animation in a stylesheet, or a timed one set from JS (composition's `transition: 'cut'` is fine)
  [/\.style\.(transition|animation)\b|\b(transition|animation)\s*:\s*['"`][^'"`]*\d+(\.\d+)?m?s\b/, 'CSS transition/animation — set styles from t instead'],
];
const BANNED_CSS = [[/^\s*(transition|animation)(-[a-z-]+)?\s*:/, 'CSS transition/animation — set styles from t instead']];

const problems = [];
const files = [...walk(ROOT)];
for (const file of files) {
  const rel = relative(ROOT, file);
  const ext = extname(file);
  const src = readFileSync(file, 'utf8');
  if (src.includes('\r')) problems.push(`${rel}: CRLF line endings`);
  if (src.length && !src.endsWith('\n')) problems.push(`${rel}: no final newline`);
  src.split('\n').forEach((line, i) => {
    if (/[ \t]+$/.test(line) && ext !== '.md') problems.push(`${rel}:${i + 1}: trailing whitespace`);
    if (/\t/.test(line) && (ext === '.js' || ext === '.mjs' || ext === '.css')) problems.push(`${rel}:${i + 1}: tab (indent with spaces)`);
  });
  if (rel.startsWith('projects/') && (ext === '.js' || ext === '.css') && !rel.endsWith('/audio.js') && !rel.includes('/content/')) {
    src.split('\n').forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // comments may mention the rules
      for (const [re, why] of ext === '.css' ? BANNED_CSS : BANNED) if (re.test(line)) problems.push(`${rel}:${i + 1}: ${why}`);
    });
  }
  if (ext === '.js' || ext === '.mjs') {
    const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (r.status !== 0) problems.push(`${rel}: syntax error\n${r.stderr.trim()}`);
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\ncheck: ${problems.length} problem(s) in ${files.length} files`);
  process.exit(1);
}
console.log(`check clean: ${files.length} files`);
