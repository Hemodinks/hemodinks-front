import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { load } from 'js-yaml';
import { browserEntityGuid, deploymentInput, MUTATION, recordDeployment } from './newrelic-change-tracking.mjs';

const SHA = '0123456789abcdef0123456789abcdef01234567';
const ENV = {
  NEW_RELIC_API_KEY: 'NRAK-SECRET', VITE_NEW_RELIC_ACCOUNT_ID: '8221159', VITE_NEW_RELIC_APPLICATION_ID: '1103',
  GITHUB_SHA: SHA, GITHUB_ACTOR: 'deployer', GITHUB_SERVER_URL: 'https://github.com',
  GITHUB_REPOSITORY: 'Hemodinks/hemodinks-front', GITHUB_RUN_ID: '42',
};

function fakeFetch(response) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    if (response instanceof Error) throw response;
    return response;
  };
  return { calls, impl };
}

const ok = { ok: true, status: 200, json: async () => ({ data: { changeTrackingCreateDeployment: { deploymentId: 'd1' } } }) };

test('browser GUID follows the New Relic entity format', () => {
  assert.equal(Buffer.from(browserEntityGuid('8221159', '1103'), 'base64').toString(), '8221159|BROWSER|APPLICATION|1103');
  assert.throws(() => browserEntityGuid('abc', '1'));
});

test('records a deployment on the Browser app with version, commit and run link', async () => {
  const { calls, impl } = fakeFetch(ok);
  const logs = [];
  assert.equal(await recordDeployment(ENV, impl, l => logs.push(l)), 0);
  assert.equal(calls[0].url, 'https://api.newrelic.com/graphql');
  assert.equal(calls[0].init.headers['API-Key'], 'NRAK-SECRET');
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.query, MUTATION);
  assert.deepEqual(body.variables.deployment, deploymentInput(ENV));
  assert.equal(body.variables.deployment.version, SHA.slice(0, 7));
  assert.equal(body.variables.deployment.deepLink, 'https://github.com/Hemodinks/hemodinks-front/actions/runs/42');
  assert.match(logs.join('\n'), /deploymentId d1/);
});

test('missing configuration skips without calling New Relic', async () => {
  for (const missing of ['NEW_RELIC_API_KEY', 'VITE_NEW_RELIC_ACCOUNT_ID', 'VITE_NEW_RELIC_APPLICATION_ID']) {
    const { calls, impl } = fakeFetch(ok);
    const logs = [];
    assert.equal(await recordDeployment({ ...ENV, [missing]: '' }, impl, l => logs.push(l)), 0);
    assert.equal(calls.length, 0);
    assert.match(logs[0], /^::notice::/);
  }
});

test('failures warn, never fail the deploy and never print the key', async () => {
  const failures = [
    new Error('network down'),
    { ok: false, status: 500, json: async () => ({}) },
    { ok: true, status: 200, json: async () => ({ errors: [{ message: 'invalid entity' }] }) },
  ];
  for (const response of failures) {
    const logs = [];
    assert.equal(await recordDeployment(ENV, fakeFetch(response).impl, l => logs.push(l)), 0);
    assert.match(logs[0], /^::warning::/);
    assert.doesNotMatch(logs.join('\n'), /NRAK-SECRET/);
  }
  const logs = [];
  assert.equal(await recordDeployment({ ...ENV, GITHUB_SHA: 'main' }, fakeFetch(ok).impl, l => logs.push(l)), 0);
  assert.match(logs[0], /GITHUB_SHA/);
});

test('production workflow records the marker only after the upload and never blocks it', () => {
  const workflow = load(readFileSync(new URL('../.github/workflows/azure-static-web-apps-production.yml', import.meta.url), 'utf8'));
  const steps = workflow.jobs.build_and_deploy.steps;
  const upload = steps.findIndex(s => s.name === 'Deploy to Azure Static Web Apps');
  const marker = steps.findIndex(s => s.name === 'Record deployment in New Relic');
  assert.ok(upload >= 0 && marker > upload);
  const step = steps[marker];
  assert.equal(step['continue-on-error'], true);
  assert.equal(step.run, 'node scripts/newrelic-change-tracking.mjs');
  assert.equal(step.env.NEW_RELIC_API_KEY, '${{ secrets.NEW_RELIC_API_KEY }}');
});
