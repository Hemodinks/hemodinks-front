import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { aggregate, renderMarkdown } from './coverage-summary.mjs';

const root = join('/repo');
const metrics = (covered, total) => Object.fromEntries(
  ['lines', 'statements', 'functions', 'branches'].map(metric => [metric, { covered, total, pct: 0 }]),
);
const summary = {
  total: metrics(9, 20),
  [join(root, 'src/services/api.ts')]: metrics(3, 4),
  [join(root, 'src/features/auth/useLoginFlow.ts')]: metrics(1, 4),
  [join(root, 'src/features/patients/PatientsPage.tsx')]: metrics(5, 12),
};

test('aggregates only the files under the area prefix', () => {
  assert.deepEqual(aggregate(summary, 'src/services/', root).lines, { covered: 3, total: 4 });
  assert.deepEqual(aggregate(summary, 'src/features/auth/', root).branches, { covered: 1, total: 4 });
  assert.deepEqual(aggregate(summary, '', root).functions, { covered: 9, total: 20 });
});

test('renders one row per area with percentages', () => {
  const markdown = renderMarkdown(summary, root);
  assert.match(markdown, /\| Total \| 45\.0% \| 45\.0% \| 45\.0% \| 45\.0% \|/);
  assert.match(markdown, /\| src\/services \| 75\.0% \|/);
  assert.match(markdown, /\| src\/features\/auth \| 25\.0% \|/);
});

test('shows a dash for an area without measured files', () => {
  assert.match(renderMarkdown({ total: metrics(0, 0) }, root), /\| src\/services \| — \| — \| — \| — \|/);
});
