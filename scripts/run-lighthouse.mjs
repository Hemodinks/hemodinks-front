import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url);
const env = { ...process.env, VITE_API_URL: '/', VITE_SENTRY_DSN: '',
  VITE_NEW_RELIC_APPLICATION_ID: '', VITE_NEW_RELIC_AGENT_ID: '', VITE_NEW_RELIC_ACCOUNT_ID: '',
  VITE_NEW_RELIC_LICENSE_KEY: '', VITE_NEW_RELIC_TRUST_KEY: '',
  VITE_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: '', OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: '',
  VITE_OTEL_EXPORTER_OTLP_ENDPOINT: '', ASPIRE_DASHBOARD_OTLP_HTTP_ENDPOINT_URL: '', OTEL_EXPORTER_OTLP_ENDPOINT: '' };

// Environment overrides belong only to these child processes; .env is untouched.
const commands = [
  ['scripts/write-otel-runtime-config.mjs'],
  [require.resolve('typescript/bin/tsc'), '-b'],
  [join(dirname(require.resolve('vite/package.json')), 'bin/vite.js'), 'build'],
];
commands.push([require.resolve('@lhci/cli/src/cli.js'), 'autorun', '--config=./lighthouserc.cjs']);
for (const args of commands) {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
