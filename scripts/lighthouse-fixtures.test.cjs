const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./lighthouse-fixtures.cjs');

test('restoration uses a synthetic, expiring session for one clinic', () => {
  const session = fixture('/api/session/restaurar', 'POST');
  assert.equal(session.email, 'audit@example.invalid');
  const claims = JSON.parse(Buffer.from(session.token.split('.')[1], 'base64url'));
  assert.equal(claims.sid, 'audit-only');
  assert.equal(claims.clinicaId, session.clinicaId);
  assert.ok(claims.exp > Date.now() / 1000);
});

test('unknown endpoints and writes are not silently accepted', () => {
  assert.equal(fixture('/api/unknown', 'GET'), undefined);
  assert.equal(fixture('/api/users', 'DELETE'), undefined);
  assert.equal(fixture('/api/pacientes', 'POST'), undefined);
});

test('representative lists have data and match the paginated contract', () => {
  for (const path of ['/api/users/', '/api/pacientes/']) {
    const page = fixture(path, 'GET');
    assert.equal(page.items.length, 10);
    assert.equal(page.totalItems, 10);
    assert.equal(page.page, 1);
  }
  assert.deepEqual(fixture('/api/events/notification-recipients', 'GET').groups, []);
});
