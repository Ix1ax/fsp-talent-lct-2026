import assert from 'node:assert/strict';

const app = process.env.REVIEW_APP_URL ?? 'http://127.0.0.1:5185';
const api = process.env.REVIEW_API_URL ?? 'http://127.0.0.1:5191';
for (const value of [app, api])
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(value).hostname));
const baseline = process.argv.includes('--baseline');
const expected = baseline ? 2 : 1;
const post = (endpoint, body) =>
  fetch(`${api}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const requests = async () =>
  (await (await fetch(`${api}/__review/requests`)).json()).filter(
    ({ path }) => path === '/api/v1/me',
  ).length;
const render = async (token, route = '/candidate/profile') => {
  const response = await fetch(`${app}${route}`, {
    headers: token ? { Cookie: `access_token=${token}` } : {},
    redirect: 'manual',
  });
  const body = await response.text();
  return {
    status: response.status,
    location: response.headers.get('location'),
    body,
  };
};
await post('/__review/reset', { scenario: 'filled' });
const first = await render('review-candidate');
assert.equal(first.status, 200);
assert.ok(first.body.includes('candidate@example.test'));
const count = await requests();
assert.equal(
  count,
  expected,
  'header and protected layout share the server render',
);
if (baseline) {
  console.log(JSON.stringify({ mode: 'before', meCallsPerRender: count }));
} else {
  await post('/__review/reset', { scenario: 'filled' });
  await render('review-candidate');
  await render('review-candidate');
  assert.equal(
    await requests(),
    2,
    'each HTTP request checks the current session again',
  );
  await post('/__review/reset', { scenario: 'filled' });
  const [candidate, employer] = await Promise.all([
    render('review-candidate', '/cabinet'),
    render('review-employer', '/cabinet'),
  ]);
  assert.ok(candidate.location?.endsWith('/candidate'));
  assert.ok(employer.location?.endsWith('/employer'));
  assert.equal(
    await requests(),
    2,
    'different requests and users have independent caches',
  );
  await post('/__review/reset', { scenario: 'filled' });
  await post('/__review/faults', [
    { path: '/api/v1/me', status: 503, times: 1 },
  ]);
  const failed = await render('review-candidate');
  assert.ok(
    failed.status >= 500 ||
      failed.body.includes('unavailable') ||
      failed.body.includes('AUTH_UNAVAILABLE') ||
      failed.body.includes('AuthUnavailableError') ||
      failed.body.includes('Сервис временно недоступен'),
  );
  assert.equal(await requests(), 1, 'one failed me call within the render');
  const recovered = await render('review-candidate');
  assert.equal(recovered.status, 200);
  assert.ok(recovered.body.includes('candidate@example.test'));
  assert.equal(
    await requests(),
    2,
    'an error is not reused by the next HTTP request',
  );
  const logout = await fetch(`${app}/api/auth/logout`, {
    method: 'POST',
    headers: {
      Origin: app,
      Cookie:
        'access_token=review-candidate; refresh_token=review-candidate-refresh',
    },
  });
  assert.ok(
    logout.headers
      .getSetCookie()
      .some((value) => value.startsWith('access_token=;')),
  );
  const guest = await render(null, '/guides');
  assert.ok(!guest.body.includes('candidate@example.test'));
  assert.equal(await requests(), 2, 'guest after logout never reuses old me');
  console.log(
    JSON.stringify({
      mode: 'after',
      meCallsPerRender: count,
      nextRequestFresh: true,
      isolatedUsers: true,
      errorNotReused: true,
      logoutClearsUser: true,
    }),
  );
}
