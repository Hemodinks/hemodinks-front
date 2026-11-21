// Writes the Vitest coverage summary (json-summary reporter) as Markdown to the GitHub job summary (#265).
// The floor itself is enforced by Vitest (coverage.thresholds in vite.config.ts); this only reports.
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const METRICS = ['lines', 'statements', 'functions', 'branches'];
export const AREAS = [
  { label: 'Total', prefix: '' },
  { label: 'src/services', prefix: 'src/services/' },
  { label: 'src/features/auth', prefix: 'src/features/auth/' },
];

const normalize = (file, root) => relative(root, file).replaceAll('\\', '/');

export function aggregate(summary, prefix, root) {
  const totals = Object.fromEntries(METRICS.map(metric => [metric, { covered: 0, total: 0 }]));
  for (const [file, data] of Object.entries(summary)) {
    if (file === 'total' || !normalize(file, root).startsWith(prefix)) continue;
    for (const metric of METRICS) {
      totals[metric].covered += data[metric].covered;
      totals[metric].total += data[metric].total;
    }
  }
  return totals;
}

const percent = ({ covered, total }) => (total === 0 ? '—' : `${(100 * covered / total).toFixed(1)}%`);

export function renderMarkdown(summary, root) {
  const rows = AREAS.map(({ label, prefix }) => {
    const totals = aggregate(summary, prefix, root);
    return `| ${label} | ${METRICS.map(metric => percent(totals[metric])).join(' | ')} |`;
  });
  return [
    '## Cobertura Vitest',
    '',
    `| Área | ${METRICS.join(' | ')} |`,
    `| --- | ${METRICS.map(() => '---:').join(' | ')} |`,
    ...rows,
    '',
    'Piso aplicado a `src/services` e `src/features/auth` (`coverage.thresholds` em `vite.config.ts`).',
    '',
  ].join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const root = process.cwd();
  const file = resolve(root, 'coverage/coverage-summary.json');
  const markdown = existsSync(file)
    ? renderMarkdown(JSON.parse(readFileSync(file, 'utf8')), root)
    : '## Cobertura Vitest\n\nRelatório não gerado (`coverage/coverage-summary.json` ausente).\n';
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
  process.stdout.write(markdown);
}
