import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const script = resolve('scripts/check-bundle-budget.mjs');

function check(t, files, budgets = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'hemodinks-budget-'));
  t.after(() => {
    assert.ok(cwd.startsWith(join(tmpdir(), 'hemodinks-budget-')));
    rmSync(cwd, { recursive: true, force: true });
  });
  for (const [name, content] of Object.entries(files)) {
    const path = join(cwd, 'dist', name);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, content);
  }
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('PERF_BUDGET_')));
  return spawnSync(process.execPath, [script], { cwd, env: { ...env, ...budgets }, encoding: 'utf8' });
}

const html = '<script type="module" src="/assets/index.js"></script>'
  + '<link rel="modulepreload" href="/assets/vendor.js">'
  + '<link rel="stylesheet" href="/assets/tutorial.css">'
  + '<link rel="stylesheet" href="/assets/index.css">';
const files = {
  'index.html': html,
  'assets/index.js': 'export {};',
  'assets/vendor.js': 'export {};',
  'assets/tutorial.css': 'a{}'.repeat(200),
  'assets/index.css': 'b{}'.repeat(200),
};

test('accepts assets below all budgets', t => {
  const result = check(t, files);
  assert.equal(result.status, 0, result.stderr);
});

test('counts every initial stylesheet, not only the first', t => {
  const result = check(t, files, { PERF_BUDGET_CSS_KB: '1' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /initial css raw/);
});

test('counts modulepreload JS together with the entry', t => {
  const result = check(t, { ...files, 'assets/vendor.js': 'x'.repeat(2048) }, { PERF_BUDGET_INITIAL_JS_KB: '1' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /initial js raw/);
});

test('enforces the combined initial gzip limit', t => {
  const result = check(t, files, { PERF_BUDGET_INITIAL_JS_GZIP_KB: '0.01' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /initial js gzip/);
});

test('counts duplicate preload and stylesheet links only once', t => {
  const result = check(t, { ...files, 'index.html': html + '<link rel="stylesheet" href="/assets/index.css">' }, { PERF_BUDGET_CSS_KB: '1.3' });
  assert.equal(result.status, 0, result.stderr);
});

test('rejects oversized deferred chunks even when the entry is small', t => {
  const result = check(t, { ...files, 'assets/deferred.js': 'x'.repeat(2048) }, { PERF_BUDGET_CHUNK_KB: '1' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /deferred.js raw/);
});

test('enforces the deferred gzip limit independently of raw size', t => {
  const result = check(t, { ...files, 'assets/deferred.js': 'x'.repeat(2048) }, { PERF_BUDGET_CHUNK_GZIP_KB: '0.03' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /deferred.js gzip/);
});

test('fails closed when a referenced stylesheet is missing', t => {
  const { 'assets/index.css': unused, ...missing } = files;
  const result = check(t, missing);
  assert.notEqual(result.status, 0);
});
