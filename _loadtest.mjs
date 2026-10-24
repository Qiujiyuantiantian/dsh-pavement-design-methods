// Load-test the book-4 plugin the way DSH would.
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = HERE;
const SKILL_DIR = join(PKG, 'skills', 'pavement-design-methods');

const registered = [];
const ctx = { skills: { register: (s) => registered.push(s) } };

const mod = await import(pathToFileURL(join(PKG, 'lib', 'startup.js')).href);
mod.default(ctx);

let fail = 0;
const say = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fail++; };

say(registered.length === 1, `注册了 ${registered.length} 个 skill（应为 1）`);
if (registered.length === 1) {
  const s = registered[0];
  say(s.name === 'pavement-design-methods', `name = ${s.name}`);
  say(typeof s.description === 'string' && s.description.length > 200,
      `description 长度 ${s.description?.length}`);
  say(!s.description.startsWith('|') && !s.description.startsWith('>'),
      'description 不是未解析的块标量标记');
  say(typeof s.content === 'string' && s.content.includes('路由表'),
      `content 含路由表（${s.content?.length} 字符）`);
  say(s.resourceBase?.kind === 'directory' && existsSync(s.resourceBase.path),
      'resourceBase 指向真实目录');

  const paths = [...s.content.matchAll(/`?(cards\/[A-Za-z0-9._\/-]+)`?/g)].map((m) => m[1]);
  const uniq = [...new Set(paths.map((p) => p.replace(/\/$/, '')))];
  const missing = uniq.filter((p) => !existsSync(join(SKILL_DIR, p)) && !existsSync(join(SKILL_DIR, p + '.md')));
  say(missing.length === 0, `路由表引用 ${uniq.length} 个路径，缺失 ${missing.length}`);
  for (const m of missing.slice(0, 5)) console.log(`       缺: ${m}`);
}

console.log(fail === 0 ? '\nRESULT: PASS' : `\nRESULT: FAIL (${fail})`);
process.exit(fail === 0 ? 0 : 1);
