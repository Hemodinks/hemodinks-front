import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildCsp, run } from './security-headers.mjs';

const root = resolve(fileURLToPath(import.meta.url), '../..');
const files = ['security-headers.json', 'public/staticwebapp.config.json', 'vercel.json', 'nginx.conf', 'nginx.proxy.conf.template'];
const sandboxes = [];

function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'security-headers-'));
  sandboxes.push(dir);
  for (const file of files) cpSync(resolve(root, file), join(dir, file));
  return dir;
}

const drifted = (report) => report.filter((item) => item.problems.length > 0).map((item) => item.id);
const edit = (dir, file, change) => writeFileSync(join(dir, file), change(readFileSync(join(dir, file), 'utf8')));

afterEach(() => {
  while (sandboxes.length) rmSync(sandboxes.pop(), { recursive: true, force: true });
});

describe('fonte única de headers de segurança (#266)', () => {
  it('os quatro destinos do repositório batem com o security-headers.json', () => {
    const report = run({ root });
    assert.equal(report.length, 4);
    assert.deepEqual(drifted(report), []);
  });

  it('falha quando a CSP de um destino diverge', () => {
    const dir = sandbox();
    edit(dir, 'nginx.conf', (text) => text.replace('https://date.nager.at ', ''));
    assert.deepEqual(drifted(run({ root: dir })), ['docker-nginx']);
  });

  it('falha com header ausente ou fora do canônico', () => {
    const dir = sandbox();
    edit(dir, 'public/staticwebapp.config.json', (text) => {
      const config = JSON.parse(text);
      delete config.globalHeaders['X-Frame-Options'];
      config.globalHeaders['X-Extra'] = '1';
      return JSON.stringify(config, null, 2);
    });
    const [azure] = run({ root: dir });
    assert.deepEqual(azure.problems, ['falta X-Frame-Options', 'X-Extra não está no security-headers.json']);
  });

  it('um domínio novo no canônico vira drift nos quatro destinos e o --write corrige', () => {
    const dir = sandbox();
    edit(dir, 'security-headers.json', (text) => {
      const canonical = JSON.parse(text);
      canonical.contentSecurityPolicy['connect-src'].push('https://novo.example');
      return JSON.stringify(canonical, null, 2);
    });
    assert.equal(drifted(run({ root: dir })).length, 4);
    assert.deepEqual(drifted(run({ root: dir, write: true })), []);
    assert.deepEqual(drifted(run({ root: dir })), []);
    for (const file of files.slice(1)) assert.match(readFileSync(join(dir, file), 'utf8'), /https:\/\/novo\.example/);
  });

  it('o --write não altera destinos que já estão sincronizados', () => {
    const dir = sandbox();
    run({ root: dir, write: true });
    for (const file of files) assert.equal(readFileSync(join(dir, file), 'utf8'), readFileSync(resolve(root, file), 'utf8'), file);
  });

  it('diferença declarada por ambiente: só a homologação libera o Render e recebe noindex', () => {
    const canonical = JSON.parse(readFileSync(resolve(root, 'security-headers.json'), 'utf8'));
    const production = buildCsp(canonical.contentSecurityPolicy);
    assert.doesNotMatch(production, /onrender\.com|unsafe-eval|localhost/);
    assert.match(production, /script-src 'self';/);
    for (const [id, target] of Object.entries(canonical.targets)) {
      const declaresRender = JSON.stringify(target).includes('onrender.com');
      assert.equal(declaresRender, id === 'vercel-homologation', id);
      assert.equal(Boolean(target.headers?.['X-Robots-Tag']), id === 'vercel-homologation', id);
    }
  });
});
