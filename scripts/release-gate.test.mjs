import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { assertReleaseRevision } from './assert-release-revision.mjs';

// Reuse the YAML parser already installed through the locked dev toolchain.
const { load } = createRequire(import.meta.url)('js-yaml');
const workflow = name => load(readFileSync(new URL(`../.github/workflows/${name}`, import.meta.url), 'utf8'));
const ci = workflow('ci.yml');
const azure = workflow('azure-static-web-apps-production.yml');
const revision = {
  eventName: 'push', ref: 'refs/heads/main', sha: 'a'.repeat(40), repository: 'Hemodinks/hemodinks-front',
};

test('production has a same-run dependency on the complete CI job', () => {
  const deploy = ci.jobs.deploy;
  assert.equal(deploy.needs, 'test-and-build');
  assert.equal(deploy.uses, './.github/workflows/azure-static-web-apps-production.yml');
  assert.equal(deploy.if, "${{ needs.test-and-build.result == 'success' && github.ref == 'refs/heads/main' && (github.event_name == 'push' || github.event_name == 'workflow_dispatch') }}");
  assert.deepEqual(Object.keys(azure.on), ['workflow_call']);
  assert.equal(ci.on.workflow_dispatch !== undefined, true);
  assert.equal(ci.on.workflow_run, undefined);
  assert.equal(ci.on.pull_request_target, undefined);
  assert.equal(existsSync(new URL('../.github/workflows/azure-static-web-apps-white-grass-0d59a4410.yml', import.meta.url)), false);
  assert.deepEqual(Object.keys(ci.jobs.deploy.secrets).sort(), [
    'AZURE_STATIC_WEB_APPS_API_TOKEN_WHITE_GRASS_0D59A4410', 'VITE_API_URL', 'VITE_SENTRY_DSN',
  ]);
  const uploadWorkflows = readdirSync(new URL('../.github/workflows/', import.meta.url))
    .filter(name => /\.ya?ml$/.test(name))
    .filter(name => JSON.stringify(workflow(name)).includes('Azure/static-web-apps-deploy@'));
  assert.deepEqual(uploadWorkflows, ['azure-static-web-apps-production.yml']);
});

for (const result of ['failure', 'cancelled', 'skipped', 'pending', 'in_progress', 'success']) {
  for (const event of ['push', 'workflow_dispatch', 'pull_request']) {
    test(`gate ${result}, ${event}`, () => {
      const expression = ci.jobs.deploy.if.slice(3, -3)
        .replaceAll('needs.test-and-build.result', 'result');
      const evaluate = new Function('result', 'github', `return (${expression});`);
      assert.equal(evaluate(result, { ref: revision.ref, event_name: event }),
        result === 'success' && event !== 'pull_request');
      assert.equal(evaluate(result, { ref: 'refs/heads/developer', event_name: event }), false);
    });
  }
}

test('CI requires gate regression tests, E2E and responsive matrix without failure bypass', () => {
  const job = ci.jobs['test-and-build'];
  assert.equal(job['continue-on-error'], undefined);
  for (const command of ['npm run test:release-gate', 'npm run audit:architecture', 'npm test', 'npm run build', 'npm run budget', 'npm run test:e2e', 'npm run test:e2e:responsive']) {
    const step = job.steps.find(step => step.run === command);
    assert.ok(step, command);
    assert.equal(step['continue-on-error'], undefined);
    if (command !== 'npm run test:e2e:responsive') assert.equal(step.if, undefined);
  }
  assert.equal(job.steps.find(step => step.name === 'Checkout').with.ref, '${{ github.sha }}');
  assert.equal(job.steps.find(step => step.run === 'npm run test:e2e:responsive').if,
    "${{ !cancelled() && steps.playwright-browsers.outcome == 'success' }}");
  assert.equal(job.env.AZURE_STATIC_WEB_APPS_API_TOKEN, undefined);
  assert.equal(job.env.VITE_API_URL, undefined);
  assert.equal(job.env.VITE_SENTRY_DSN, '');
});

test('production is serialized, pinned and revalidated immediately before upload', () => {
  const job = azure.jobs.build_and_deploy;
  assert.equal(ci.concurrency['cancel-in-progress'], "${{ github.ref != 'refs/heads/main' }}");
  assert.deepEqual(job.concurrency, { group: 'azure-static-web-apps-production', 'cancel-in-progress': false });
  assert.equal(job.if, ci.jobs.deploy.if.replace("needs.test-and-build.result == 'success' && ", ''));
  assert.deepEqual(azure.permissions, { contents: 'read' });
  assert.equal(job.steps.find(step => step.name === 'Checkout').with.ref, '${{ github.sha }}');
  const upload = job.steps.findIndex(step => step.uses === 'Azure/static-web-apps-deploy@v1');
  assert.equal(job['continue-on-error'], undefined);
  for (const step of [job.steps[upload - 1], job.steps[upload]]) {
    assert.equal(step.if, undefined);
    assert.equal(step['continue-on-error'], undefined);
  }
  assert.equal(job.steps[upload - 1].run, 'node scripts/assert-release-revision.mjs');
  assert.equal(job.steps[upload].with.app_location, 'dist');
  assert.equal(job.steps[upload].with.skip_app_build, true);
  assert.equal(job.steps[upload].env.AZURE_STATIC_WEB_APPS_API_TOKEN, '${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN_WHITE_GRASS_0D59A4410 }}');
  assert.equal(job.env.AZURE_STATIC_WEB_APPS_API_TOKEN, undefined);
  assert.equal(job.env.VITE_API_URL, undefined);
  assert.equal(job.env.VITE_SENTRY_DSN, '');
  assert.equal(job.steps.find(step => step.name === 'Build').env.VITE_APP_ENV, 'production');
});

test('current SHA allows push and manual execution, including reruns', () => {
  for (const eventName of ['push', 'workflow_dispatch']) {
    assert.doesNotThrow(() => assertReleaseRevision({ ...revision, eventName }, () => `${revision.sha}\n`));
  }
});

test('divergent SHA, concurrent push and stale rerun fail closed', () => {
  assert.throws(() => assertReleaseRevision(revision, () => 'b'.repeat(40)), /no longer the main head/);
});

test('PRs and manual dispatch outside main cannot deploy', () => {
  for (const input of [{ ...revision, eventName: 'pull_request' }, { ...revision, eventName: 'workflow_run' }, { ...revision, ref: 'refs/heads/developer' }]) {
    assert.throws(() => assertReleaseRevision(input, () => { assert.fail('must not query main'); }), /requires a main/);
  }
});

test('API errors, empty head and invalid context fail closed', () => {
  assert.throws(() => assertReleaseRevision(revision, () => { throw new Error('API unavailable'); }));
  assert.throws(() => assertReleaseRevision(revision, () => ''), /no longer/);
  assert.throws(() => assertReleaseRevision({ ...revision, sha: '' }, () => revision.sha), /Invalid/);
});
