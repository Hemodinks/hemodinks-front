import { spawn, spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assertSyntheticFixture, assertRealApiResults } from './real-api-policy.mjs';

const root = resolve(import.meta.dirname, '..');
const apiRoot = resolve(process.env.HEMODINKS_API_ROOT ?? resolve(root, '../hemodinks-api'));
const runId = randomUUID().replaceAll('-', '');
const container = `hemodinks-web-e2e-${runId}`;
const results = resolve(root, 'test-results/real-api');
const fixturePath = resolve(results, 'fixture.json');
const reportPath = resolve(results, 'results.json');
const summaryPath = resolve(results, 'summary.json');
const storagePath = resolve(results, `storage-${runId}`);
if (resolve(storagePath, '..') !== results || !/^storage-[a-f0-9]{32}$/.test(storagePath.split(/[\\/]/).at(-1))) {
  throw new Error('Owned storage directory must remain inside this run workspace.');
}
let host;
let playwright;
let containerCreated = false;
let cleaning;
function command(binary, args, options = {}) {
  const result = spawnSync(binary, args, { cwd: root, encoding: 'utf8', ...options });
  if (result.error || result.status !== 0) throw new Error(`${binary} failed (${result.status ?? 'unavailable'}).`);
  return result.stdout.trim();
}
function stop(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
  else { try { process.kill(-child.pid, 'SIGTERM'); } catch { /* already exited */ } }
}
async function cleanup() {
  return cleaning ??= (async () => {
    stop(playwright);
    stop(host);
    try {
      if (containerCreated) command('docker', ['rm', '-f', container]);
    } finally {
      await rm(fixturePath, { force: true });
      await rm(storagePath, { force: true, recursive: true });
    }
  })();
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void cleanup().finally(() => process.exit(1)); });

try {
  await mkdir(results, { recursive: true });
  await mkdir(storagePath, { recursive: true });
  await rm(fixturePath, { force: true });
  await rm(reportPath, { force: true });
  await rm(summaryPath, { force: true });
  // Own container, no volume, randomly allocated loopback-only host port. Never use a supplied SQL connection.
  const sqlPassword = `E2e!${randomBytes(24).toString('hex')}`;
  command('docker', ['run', '-d', '--name', container, '--label', 'hemodinks.synthetic-e2e=true',
    '-e', 'ACCEPT_EULA=Y', '-e', 'MSSQL_SA_PASSWORD', '-p', '127.0.0.1::1433',
    'mcr.microsoft.com/mssql/server:2022-latest'], { env: { ...process.env, MSSQL_SA_PASSWORD: sqlPassword } });
  containerCreated = true;
  const mapping = command('docker', ['port', container, '1433/tcp']);
  const port = /^127\.0\.0\.1:(\d+)$/.exec(mapping)?.[1];
  if (!port) throw new Error('SQL must bind exclusively to loopback.');
  const deadline = Date.now() + 120_000;
  while (true) {
    const ready = spawnSync('docker', ['exec', '-e', 'SQLCMDPASSWORD', container, '/opt/mssql-tools18/bin/sqlcmd',
      '-S', 'localhost', '-U', 'sa', '-C', '-Q', 'SELECT 1', '-b'], { env: { ...process.env, SQLCMDPASSWORD: sqlPassword }, stdio: 'ignore' });
    if (ready.status === 0) break;
    if (Date.now() > deadline) throw new Error('Disposable SQL did not become ready.');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  // Deliberately small environment: no Azure/SMTP/OTLP/user-secret credentials passed to API.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    /^(PATH|SystemRoot|WINDIR|TEMP|TMP|TMPDIR|HOME|USERPROFILE|APPDATA|LOCALAPPDATA|ProgramFiles|ProgramFiles\(x86\)|DOTNET_ROOT|NUGET_PACKAGES)$/i.test(key)));
  Object.assign(env, {
    HEMODINKS_API_ROOT: apiRoot, HEMODINKS_REAL_FIXTURE: fixturePath,
    HEMODINKS_SYNTHETIC_STORAGE: storagePath,
    HEMODINKS_SYNTHETIC_SQL: `Server=127.0.0.1,${port};Database=HemodinksWebE2E_${runId};User Id=sa;Password=${sqlPassword};Encrypt=False;TrustServerCertificate=True`,
    ASPNETCORE_TEST_CONTENTROOT_HEMODINKSAPI_API: resolve(apiRoot, 'HemodinksAPI.Api'),
    DOTNET_ENVIRONMENT: 'Testing', ASPNETCORE_ENVIRONMENT: 'Testing',
  });
  console.log('Starting isolated API + synthetic SQL Server (no external target).');
  host = spawn('dotnet', ['run', '--project', 'integration/real-api/RealApiHost.csproj', `-p:ApiRoot=${apiRoot}`, '--no-launch-profile'],
    { cwd: root, env, detached: process.platform !== 'win32', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  await new Promise((resolveReady, reject) => {
    const timer = setTimeout(() => reject(new Error('Synthetic API startup timed out.')), 240_000);
    let output = '';
    const inspect = chunk => {
      output = (output + chunk.toString()).slice(-16000);
      if (output.includes('SYNTHETIC_API_READY')) { clearTimeout(timer); resolveReady(); }
    };
    host.stdout.on('data', inspect);
    host.stderr.on('data', inspect);
    host.once('error', error => { clearTimeout(timer); reject(error); });
    host.once('exit', code => {
      clearTimeout(timer);
      const diagnostic = output.replaceAll(sqlPassword, '[redacted]').replaceAll(env.HEMODINKS_SYNTHETIC_SQL, '[redacted connection]');
      reject(new Error(`Synthetic API exited (${code}) before authentication. ${diagnostic.slice(-6000)}`));
    });
  });
  assertSyntheticFixture(JSON.parse(await readFile(fixturePath, 'utf8')));
  playwright = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '--config=playwright.real-api.config.ts', ...process.argv.slice(2)], {
    cwd: root, detached: process.platform !== 'win32', windowsHide: true, stdio: 'inherit', env: {
      ...process.env, HEMODINKS_REAL_FIXTURE: fixturePath, VITE_API_URL: 'http://127.0.0.1:5193',
      VITE_SENTRY_DSN: '', VITE_APP_ENV: 'synthetic-e2e',
    },
  });
  const code = await new Promise((resolveExit, reject) => { playwright.once('exit', resolveExit); playwright.once('error', reject); });
  if (code !== 0) throw new Error(`Playwright failed (${code}).`);
  assertRealApiResults(JSON.parse(await readFile(reportPath, 'utf8')));
  console.log('Real API gate passed: no skips, retries or flaky scenarios.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  // Only this allowlisted summary may be published; raw Playwright errors can include request headers.
  let stats = null;
  const scenarios = [];
  try {
    const report = JSON.parse(await readFile(reportPath, 'utf8'));
    stats = Object.fromEntries(['expected', 'unexpected', 'skipped', 'flaky'].map(key => [key, report.stats?.[key] ?? 0]));
    function collect(suite) {
      for (const spec of suite.specs ?? []) {
        const name = spec.title.split(':')[0];
        if (!['login', 'sessão', 'pacientes', 'multi-clínica', 'IDOR', 'faturamento', 'exportações', 'equipes', 'agenda'].includes(name)) continue;
        const result = spec.tests?.[0];
        scenarios.push({ name, status: result?.status, counts: Object.fromEntries((result?.annotations ?? [])
          .filter(item => ['api-5xx-count', 'page-error-count', 'session-busy-count'].includes(item.type))
          .map(item => [item.type, Number(item.description)])) });
      }
      for (const child of suite.suites ?? []) collect(child);
    }
    for (const suite of report.suites ?? []) collect(suite);
  } catch { /* startup/discovery failure: do not report a passing suite */ }
  try {
    await writeFile(summaryPath, JSON.stringify({
      passed: process.exitCode !== 1 && stats !== null, stats, scenarios,
      frontendRevision: command('git', ['rev-parse', 'HEAD']),
      frontendWorkingTreeDirty: Boolean(command('git', ['status', '--porcelain'])),
      apiRevision: command('git', ['-C', apiRoot, 'rev-parse', 'HEAD']),
      apiWorkingTreeDirty: Boolean(command('git', ['-C', apiRoot, 'status', '--porcelain'])),
      database: 'disposable SQL Server; current EF schema; synthetic fixtures',
    }, null, 2));
  } finally {
    await cleanup();
  }
}
