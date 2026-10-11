// API contract check: does every typed read `api<T>('name')` match the captured backend JSON in data/api/<name>.json?
//   pnpm check:api
// For each module with such reads, writes a temporary sibling copy that adds `const _: Loose<T> = <json import>`,
// type-checks only those copies with tsc, prints the mismatches and deletes the copies. Loose<T> widens
// string-literal unions to string (a JSON import only knows `string`), so what is reported is shape, nullability and
// number/string mismatches. A pass proves the snapshot fits the types, not that every future response will.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const files = ['app', 'components', 'lib'].flatMap(function walk(d) {
  return fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return p.startsWith(path.join('app', 'api')) ? [] : walk(p);
    return /\.tsx?$/.test(e.name) && !e.name.startsWith('__apicheck_') ? [p] : [];
  });
});

// api<T>('name'): T may contain parentheses (function types) but not across calls.
const CALL = /\bapi<((?:[^()]|\([^)]*\))*?)>\(\s*['"`]([a-z0-9-]+)['"`]/gs;
const LOOSE = 'type __Loose<T> = T extends string ? string : T extends (infer U)[] ? __Loose<U>[] : T extends object ? { [K in keyof T]: __Loose<T[K]> } : T;';
const made = [];
let reads = 0;
try {
  for (const f of files) {
    const src = read(f);
    const calls = [...src.matchAll(CALL)].filter((m) => fs.existsSync(path.join(root, 'data/api', `${m[2]}.json`)));
    if (!calls.length) continue;
    reads += calls.length;
    const lines = ['', '// ---- api contract checks (temporary) ----', LOOSE];
    calls.forEach((m, i) => {
      lines.push(`import __j${i} from '@/data/api/${m[2]}.json';`);
      lines.push(`export const __c${i}: __Loose<${m[1]}> = __j${i}; // ${m[2]}`);
    });
    const out = path.join(path.dirname(f), `__apicheck_${path.basename(f)}`);
    fs.writeFileSync(path.join(root, out), src + lines.join('\n') + '\n');
    made.push(out);
  }
  const cfg = path.join(root, 'tsconfig.apicheck.json');
  fs.writeFileSync(cfg, JSON.stringify({ extends: './tsconfig.json', compilerOptions: { noEmit: true, incremental: false }, include: ['next-env.d.ts', ...made], exclude: ['node_modules'] }));
  made.push('tsconfig.apicheck.json');
  try {
    execFileSync(path.join(root, 'node_modules/.bin/tsc'), ['-p', cfg, '--pretty', 'false'], { cwd: root, encoding: 'utf8', stdio: 'pipe' });
    console.log(`api contract: ${reads} typed reads in ${made.length - 1} modules match the snapshot`);
  } catch (e) {
    const outText = String(e.stdout ?? '') + String(e.stderr ?? '');
    const errs = outText.split(/\n(?=\S+\(\d+,\d+\): error)/).filter((b) => b.includes('error TS'));
    for (const b of errs) {
      const ls = b.trim().split('\n');
      const where = ls[0].replace('__apicheck_', '').split(': error')[0];
      const why = ls.slice(1).map((l) => l.trim()).filter((l) => /Types of property|is missing|not assignable to type '(number|string|null|boolean)/.test(l)).slice(-3);
      console.log(`✖ ${where}\n    ${(why.length ? why : ls.slice(-2)).join('\n    ')}`);
    }
    console.log(`api contract: ${errs.length} mismatch(es) across ${reads} typed reads`);
    process.exitCode = 1;
  }
} finally {
  for (const m of made) fs.rmSync(path.join(root, m), { force: true });
}
