import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { createFixtures } from './fixtures.mjs';
import { createMockApi } from './mock-api.mjs';

let server, base;
before(async () => {
  server = createMockApi();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});
const configure = (rules) =>
  fetch(`${base}/__review/faults`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rules),
  });

test('fixtures cover empty, filled, multiple companies and paginated catalogs', () => {
  assert.equal(createFixtures('empty').full.profile, null);
  assert.deepEqual(createFixtures('empty').companies, []);
  assert.equal(createFixtures('filled').full.profile.experience_months, 25);
  assert.equal(createFixtures('filled').companies.length, 2);
  assert.equal(createFixtures('large').skills.length, 205);
});
for (const status of [401, 403, 409, 503])
  test(`reproduces ${status} once, then recovers`, async () => {
    await configure([{ path: '/api/v1/me', status, times: 1 }]);
    assert.equal((await fetch(`${base}/api/v1/me`)).status, status);
    assert.equal((await fetch(`${base}/api/v1/me`)).status, 200);
  });
test('supports delayed responses and a client-enforced timeout', async () => {
  await configure([{ path: '/api/v1/me', delayMs: 50 }]);
  const start = performance.now();
  assert.equal((await fetch(`${base}/api/v1/me`)).status, 200);
  assert.ok(performance.now() - start >= 45);
  await configure([{ path: '/api/v1/me', timeout: true }]);
  await assert.rejects(
    fetch(`${base}/api/v1/me`, { signal: AbortSignal.timeout(50) }),
    { name: 'TimeoutError' },
  );
});
test('records requests without credentials or bodies', async () => {
  await configure([]);
  await fetch(`${base}/api/v1/me`, {
    headers: {
      Authorization: 'Bearer private-value',
      Cookie: 'private-cookie',
    },
  });
  const log = await (await fetch(`${base}/__review/requests`)).json();
  assert.ok(log.length > 0);
  assert.equal(JSON.stringify(log).includes('private'), false);
  assert.deepEqual(Object.keys(log[0]).sort(), ['method', 'path', 'query']);
});
