// Dev entry: /studio/index.html?project=<name>[&render][#t=<seconds>]
import { boot, fail } from './runtime.js';

const params = new URLSearchParams(location.search);
const project = params.get('project');
if (!project) fail('Missing ?project=<name>');
const base = new URL(`../projects/${project}/`, import.meta.url);
const comp = (await import(new URL('composition.js', base))).default;
boot({ comp, project, mode: params.has('render') ? 'render' : 'preview', resolve: (p) => new URL(p, base).href });
