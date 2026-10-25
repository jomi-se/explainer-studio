// Preview server. `node scripts/serve.mjs [--port 4173] [--host 0.0.0.0]`
// then open the printed URL for each project.

import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, parseArgs, startServer } from './lib.mjs';

const args = parseArgs();
const { url } = await startServer({ port: Number(args.port ?? 4173), host: args.host ?? '0.0.0.0' });
const projects = readdirSync(join(ROOT, 'projects')).filter((p) => existsSync(join(ROOT, 'projects', p, 'composition.js')));
console.log(`Explainer Studio serving ${ROOT}`);
for (const p of projects) console.log(`  ${p.padEnd(24)} ${url}/studio/index.html?project=${p}`);
console.log('Keys: space play · ←/→ frame · shift+←/→ 1s · 1-9 scene · L loop scene');
