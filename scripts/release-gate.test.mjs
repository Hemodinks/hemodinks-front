import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { assertReleaseRevision } from './assert-release-revision.mjs';
import { gateDecision } from './ci-gate.mjs';

// Reuse the YAML parser already installed through the locked dev toolchain.
const { load } = createRequire(import.meta.url)('js-yaml');
const workflow = name => load(readFileSync(new URL(`../.github/workflows/${name}`, import.meta.url), 'utf8'));
const ci = workflow('ci.yml');
const azure = workflow('azure-static-web-apps-production.yml');
const SWA_DEPLOY = 'Azure/static-web-apps-deploy@1a947af9992250f3bc2e68ad0754c0b0c11566c9';
const workflowDir = new URL('../.github/workflows/', import.meta.url);
// Actions externas: SHA completo + comentario de versao (#222); workflows locais (./) ficam de fora.
const unpinnedActions = text => [...text.matchAll(/^\s*(?:-\s*)?uses:\s*(\S+)(.*)$/gm)]
  .filter(([, ref]) => !ref.startsWith('./'))
  .filter(([, ref, rest]) => !/^[\w.-]+\/[\w./-]+@[0-9a-f]{40}$/.test(ref) || !/^\s*#\s*v\d+(\.\d+)*\s*$/.test(rest))
  .map(([, ref]) => ref);
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
    'AZURE_STATIC_WEB_APPS_API_TOKEN_WHITE_GRASS_0D59A4410', 'VITE_API_URL',
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
  const required = {
    unit: ['npm run test:release-gate', 'npm run audit:architecture', 'npm test', 'npm run build', 'npm run budget'],
    e2e: ['npm run test:e2e -- --shard=${{ matrix.shard }}/3'],
    responsive: ['npm run test:e2e:responsive'],
  };
  for (const [name, commands] of Object.entries(required)) {
    const job = ci.jobs[name];
    assert.deepEqual(job.needs, 'scope', name);
    assert.equal(job.if, "${{ !cancelled() && needs.scope.outputs.run_tests != 'false' }}", name);
    assert.equal(job['continue-on-error'], undefined, name);
    for (const command of commands) {
      const step = job.steps.find(step => step.run === command);
      assert.ok(step, `${name}: ${command}`);
      assert.equal(step['continue-on-error'], undefined);
      assert.equal(step.if, undefined);
    }
    assert.equal(job.steps.find(step => step.name === 'Checkout').with.ref, '${{ github.sha }}');
    for (const secret of ['AZURE_STATIC_WEB_APPS_API_TOKEN', 'VITE_API_URL', 'VITE_SENTRY_DSN']) {
      assert.equal(job.env?.[secret], undefined, `${name}: ${secret}`);
    }
  }
  assert.deepEqual(ci.jobs.e2e.strategy, { 'fail-fast': false, matrix: { shard: [1, 2, 3] } });
});

test('Test and build aggregates every test job and fails closed', () => {
  const gate = ci.jobs['test-and-build'];
  assert.equal(gate.name, 'Test and build');
  assert.deepEqual(gate.needs, ['scope', 'unit', 'e2e', 'responsive']);
  assert.equal(gate.if, '${{ always() }}');
  assert.equal(gate['continue-on-error'], undefined);
  assert.equal(gate.steps.at(-1).run, 'node scripts/ci-gate.mjs');
  assert.deepEqual(gate.steps.at(-1).env, {
    SCOPE_RESULT: '${{ needs.scope.result }}',
    RUN_TESTS: '${{ needs.scope.outputs.run_tests }}',
    UNIT_RESULT: '${{ needs.unit.result }}',
    E2E_RESULT: '${{ needs.e2e.result }}',
    RESPONSIVE_RESULT: '${{ needs.responsive.result }}',
  });
});

test('scope reuse requires the real test job names of this workflow', () => {
  const env = ci.jobs.scope.steps.find(step => step.id === 'decide').env;
  assert.equal(env.CI_WORKFLOW, 'ci.yml');
  const prefixes = env.CI_REQUIRED_JOBS.split(',');
  assert.deepEqual(prefixes, [ci.jobs.unit.name, ci.jobs.e2e.name.split('$')[0], ci.jobs.responsive.name]);
});

const passed = { scope: 'success', runTests: 'true', unit: 'success', e2e: 'success', responsive: 'success' };
const reused = { scope: 'success', runTests: 'false', unit: 'skipped', e2e: 'skipped', responsive: 'skipped' };

test('gate passes when all test jobs pass or a proven tree skipped all of them', () => {
  assert.equal(gateDecision(passed).ok, true);
  assert.equal(gateDecision(reused).ok, true);
});

test('gate blocks any failed, cancelled, skipped or unknown result', () => {
  for (const job of ['unit', 'e2e', 'responsive']) {
    for (const result of ['failure', 'cancelled', 'skipped', '', undefined]) {
      assert.equal(gateDecision({ ...passed, [job]: result }).ok, false, `${job}=${result}`);
    }
    assert.equal(gateDecision({ ...reused, [job]: 'success' }).ok, false, `reuse with ${job} ran`);
    assert.equal(gateDecision({ ...reused, [job]: 'failure' }).ok, false, `reuse with ${job} failed`);
  }
  for (const scope of ['failure', 'cancelled', 'skipped', '']) {
    assert.equal(gateDecision({ ...passed, scope }).ok, false, scope);
    assert.equal(gateDecision({ ...reused, scope }).ok, false, scope);
  }
  for (const runTests of ['', 'yes', undefined]) {
    assert.equal(gateDecision({ ...passed, runTests }).ok, false, String(runTests));
  }
});

test('production is serialized, pinned and revalidated immediately before upload', () => {
  const job = azure.jobs.build_and_deploy;
  assert.equal(ci.concurrency['cancel-in-progress'], "${{ github.ref != 'refs/heads/main' }}");
  assert.deepEqual(job.concurrency, { group: 'azure-static-web-apps-production', 'cancel-in-progress': false });
  assert.equal(job.if, ci.jobs.deploy.if.replace("needs.test-and-build.result == 'success' && ", ''));
  assert.deepEqual(azure.permissions, { contents: 'read' });
  assert.equal(job.steps.find(step => step.name === 'Checkout').with.ref, '${{ github.sha }}');
  const upload = job.steps.findIndex(step => step.uses === SWA_DEPLOY);
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
  assert.equal(job.env.VITE_SENTRY_DSN, undefined);
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

test('third-party actions are pinned by full SHA with a version comment', () => {
  const files = readdirSync(workflowDir).filter(name => /\.ya?ml$/.test(name));
  assert.ok(files.length > 0);
  const problems = Object.fromEntries(files
    .map(name => [name, unpinnedActions(readFileSync(new URL(name, workflowDir), 'utf8'))])
    .filter(([, refs]) => refs.length > 0));
  assert.deepEqual(problems, {});
  const dependabot = readFileSync(new URL('../.github/dependabot.yml', import.meta.url), 'utf8');
  assert.match(dependabot, /package-ecosystem: github-actions/);
  assert.match(dependabot, /target-branch: developer/);
});

test('pin check rejects tags, branches, short SHAs and missing version comments', () => {
  for (const line of [
    'uses: actions/checkout@v6',
    'uses: actions/checkout@main',
    'uses: actions/checkout@3d3c42e',
    '- uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1',
  ]) assert.equal(unpinnedActions(line).length, 1, line);
  assert.deepEqual(unpinnedActions(
    '  - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1\n    uses: ./.github/workflows/x.yml',
  ), []);
});
