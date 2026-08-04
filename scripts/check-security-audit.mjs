import { spawnSync } from 'node:child_process';
import process from 'node:process';

const allowedPackages = new Set(['react-router', 'react-router-dom']);
const allowedAdvisory = 'GHSA-qwww-vcr4-c8h2';
const reviewDeadline = '2026-08-28';
const auditCommand = process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : 'npm';
const auditArguments =
  process.platform === 'win32' ? ['/d', '/s', '/c', 'npm audit --json'] : ['audit', '--json'];
const audit = spawnSync(auditCommand, auditArguments, {
  cwd: process.cwd(),
  encoding: 'utf8',
});

let report;
try {
  report = JSON.parse(audit.stdout);
} catch {
  console.error('Não foi possível interpretar o resultado de npm audit.');
  if (audit.error) console.error(audit.error.message);
  if (audit.stderr) console.error(audit.stderr.trim());
  process.exit(1);
}

const vulnerabilities = Object.entries(report.vulnerabilities ?? {});
if (vulnerabilities.length === 0) {
  console.log('npm audit não encontrou vulnerabilidades.');
  process.exit(0);
}

const unexpected = vulnerabilities.filter(([packageName, vulnerability]) => {
  if (!allowedPackages.has(packageName)) return true;
  const advisoryUrls = (vulnerability.via ?? [])
    .filter((item) => typeof item === 'object' && item !== null)
    .map((item) => item.url ?? '');
  return advisoryUrls.some((url) => !url.includes(allowedAdvisory));
});

if (unexpected.length > 0) {
  console.error('npm audit encontrou vulnerabilidades fora da exceção documentada:');
  for (const [packageName, vulnerability] of unexpected) {
    console.error(`- ${packageName}: ${vulnerability.severity}`);
  }
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
if (today > reviewDeadline) {
  console.error(
    `A exceção ${allowedAdvisory} venceu em ${reviewDeadline}. Reavalie SECURITY.md e atualize a data somente após a revisão.`,
  );
  process.exit(1);
}

console.warn(
  `Exceção temporária ${allowedAdvisory} confirmada. Próxima revisão obrigatória: ${reviewDeadline}.`,
);
