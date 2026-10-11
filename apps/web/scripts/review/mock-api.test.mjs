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

test('company access is independent of verification and preserves idempotent block metadata', async () => {
  await fetch(`${base}/__review/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const company = createFixtures().companies[0];
  const path = `${base}/api/v1/admin/companies/${company.id}`;
  const patch = (suffix, body) =>
    fetch(`${path}/${suffix}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  assert.equal(
    (await patch('status', { status: 'blocked', reason: '  ' })).status,
    400,
  );
  assert.equal(
    (
      await patch('status', {
        status: 'blocked',
        reason: 'Причина',
        expected_version: 1,
      })
    ).status,
    400,
  );
  const blocked = await (
    await patch('status', {
      status: 'blocked',
      reason: ' Причина\nблокировки ',
    })
  ).json();
  assert.equal(blocked.verification_status, 'pending');
  assert.equal(blocked.blocked_reason, 'Причина\nблокировки');
  const duplicate = await (
    await patch('status', { status: 'blocked', reason: 'Другая причина' })
  ).json();
  assert.equal(duplicate.blocked_reason, blocked.blocked_reason);
  assert.equal(duplicate.blocked_at, blocked.blocked_at);
  const list = await (
    await fetch(
      `${base}/api/v1/admin/companies?status=pending&access_status=blocked`,
    )
  ).json();
  assert.equal(list.total, 1);
  assert.equal(
    (await (await fetch(`${base}/api/v1/admin/stats`)).json()).companies
      .blocked,
    1,
  );
  assert.equal(
    (
      await (
        await fetch(
          `${base}/api/v1/admin/audit-events?entity_id=${company.id}&action=company.status_changed`,
        )
      ).json()
    ).total,
    1,
  );
  const active = await (
    await patch('status', { status: 'active', reason: 'Устранено' })
  ).json();
  assert.equal(active.blocked_reason, null);
  assert.equal(active.blocked_at, null);
  assert.equal(
    (await patch('verification', { status: 'verified', expected_version: 0 }))
      .status,
    409,
  );
  assert.equal(
    (await patch('verification', { status: 'verified', expected_version: 1 }))
      .status,
    200,
  );
});

test('admin identity search covers both emails, names and stable IDs with combined filters', async () => {
  await fetch(`${base}/__review/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const users = createFixtures().adminUsers;
  for (const q of [
    'КАНДИДАТ',
    'contacts@example.test',
    users[1].id,
    users[1].candidate_profile_id,
  ]) {
    const response = await fetch(
      `${base}/api/v1/admin/users?${new URLSearchParams({ q, role: 'candidate', status: 'blocked' })}`,
    );
    const data = await response.json();
    assert.equal(data.total, 1);
    assert.equal(data.items[0].id, users[1].id);
  }
  const literal = await (
    await fetch(`${base}/api/v1/admin/users?q=%25`)
  ).json();
  assert.equal(literal.total, 0);
  const page = await (
    await fetch(`${base}/api/v1/admin/users?offset=1&limit=1`)
  ).json();
  assert.equal(page.total, 4);
  assert.equal(page.items[0].id, users[1].id);
});
test('company members and user companies retain independent statuses and support pagination', async () => {
  const fixtures = createFixtures();
  const members = await (
    await fetch(
      `${base}/api/v1/admin/companies/${fixtures.companies[0].id}/members`,
    )
  ).json();
  assert.equal(members.items[1].status, 'inactive');
  assert.equal(members.items[1].user_status, 'blocked');
  assert.equal(members.items[1].full_name, fixtures.adminUsers[1].full_name);
  assert.equal(
    members.items[1].user_blocked_reason,
    fixtures.adminUsers[1].blocked_reason,
  );
  const companies = await (
    await fetch(
      `${base}/api/v1/admin/users/${fixtures.adminUsers[0].id}/companies?offset=1&limit=1`,
    )
  ).json();
  assert.equal(companies.total, 2);
  assert.equal(companies.items[0].status, 'inactive');
  assert.equal(companies.items[0].company_status, 'active');
  const blocked = await fetch(
    `${base}/api/v1/admin/companies/${fixtures.companies[0].id}/status`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'blocked', reason: 'Проверка' }),
    },
  );
  assert.equal(blocked.status, 200);
  const related = await (
    await fetch(
      `${base}/api/v1/admin/users/${fixtures.adminUsers[0].id}/companies`,
    )
  ).json();
  assert.equal(related.items[0].company_status, 'blocked');
  const audit = await (
    await fetch(
      `${base}/api/v1/admin/audit-events?actor_id=${fixtures.admin.id}`,
    )
  ).json();
  assert.equal(audit.total, 1);
  assert.equal(audit.items[0].actor_email, fixtures.admin.email);
  assert.equal(audit.items[0].actor_name, null);
});
