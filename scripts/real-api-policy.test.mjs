import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertSyntheticFixture, assertRealApiResults } from './real-api-policy.mjs';

const fixture = { apiUrl: 'http://127.0.0.1:5193', a: { id: 10 }, b: { id: 11 }, multiEmail: 'multi@example.invalid' };
test('accepts only distinct synthetic clinics on the owned loopback API', () => assert.equal(assertSyntheticFixture(fixture), fixture));
for (const apiUrl of ['https://production.example', 'http://localhost:5000', 'http://127.0.0.1:5000']) {
  test(`rejects non-owned API ${apiUrl}`, () => assert.throws(() => assertSyntheticFixture({ ...fixture, apiUrl })));
}
test('rejects same clinic and non-synthetic identity', () => {
  assert.throws(() => assertSyntheticFixture({ ...fixture, b: fixture.a }));
  assert.throws(() => assertSyntheticFixture({ ...fixture, multiEmail: 'real@example.com' }));
});
const complete = { stats: { expected: 9, unexpected: 0, skipped: 0, flaky: 0 }, suites: [{ specs:
  ['login', 'sessão', 'pacientes', 'multi-clínica', 'IDOR', 'faturamento', 'exportações', 'equipes', 'agenda'].map(name => ({
    title: `${name}: required`, tests: [{ results: [{ status: 'passed', retry: 0 }] }],
  })),
}] };
test('accepts complete suite', () => assertRealApiResults(complete));
test('rejects nine repeats of only login', () => assert.throws(() => assertRealApiResults({
  ...complete, suites: [{ specs: Array(9).fill(complete.suites[0].specs[0]) }],
})));
test('rejects hidden retry', () => {
  const retried = structuredClone(complete);
  retried.suites[0].specs[0].tests[0].results[0].retry = 1;
  assert.throws(() => assertRealApiResults(retried));
});
for (const stats of [{ expected: 0 }, { expected: 8 }, { expected: 9, skipped: 1 }, { expected: 9, flaky: 1 }, { expected: 9, unexpected: 1 }]) {
  test(`rejects incomplete or unsuccessful suite ${JSON.stringify(stats)}`, () => assert.throws(() => assertRealApiResults({ stats })));
}
