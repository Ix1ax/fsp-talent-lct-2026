import assert from 'node:assert/strict';

const base = process.env.REVIEW_APP_URL ?? 'http://127.0.0.1:5185';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const tokens = {
  accessToken: 'review-candidate',
  refreshToken: 'review-candidate-refresh',
  expiresIn: 900,
};
const session = (headers) =>
  fetch(`${base}/api/auth/session`, {
    method: 'POST',
    headers,
    body: JSON.stringify(tokens),
  });
for (const [origin, contentType, status] of [
  ['https://untrusted.example', 'text/plain', 403],
  ['https://untrusted.example', 'application/json', 403],
  [undefined, 'application/json', 403],
  [base, 'text/plain', 415],
  [base, 'application/x-www-form-urlencoded', 415],
  [base, 'multipart/form-data', 415],
]) {
  const response = await session({
    ...(origin ? { Origin: origin } : {}),
    'Content-Type': contentType,
  });
  assert.equal(response.status, status);
  assert.deepEqual(response.headers.getSetCookie(), []);
}
const valid = await session({
  Origin: base,
  'Content-Type': 'application/json; charset=utf-8',
});
assert.equal(valid.status, 200);
const cookies = valid.headers.getSetCookie();
assert.equal(cookies.length, 2);
assert.ok(
  cookies.every(
    (cookie) => /httponly/i.test(cookie) && /samesite=lax/i.test(cookie),
  ),
);
const cookie = cookies.map((value) => value.split(';')[0]).join('; ');
const reload = await fetch(`${base}/candidate/profile`, {
  headers: { Cookie: cookie },
  redirect: 'manual',
});
assert.equal(reload.status, 200);
assert.ok((await reload.text()).includes('Профиль'));
const refresh = await fetch(`${base}/api/auth/refresh`, {
  method: 'POST',
  headers: { Origin: base, Cookie: cookie },
});
assert.equal(refresh.status, 200);
assert.equal((await refresh.json()).accessToken, tokens.accessToken);
const recovery = await fetch(
  `${base}/api/auth/refresh?next=/candidate/profile`,
  { headers: { Cookie: cookie }, redirect: 'manual' },
);
assert.equal(recovery.status, 307);
assert.equal(recovery.headers.get('location'), `${base}/candidate/profile`);
const external = await fetch(
  `${base}/api/auth/refresh?next=https://evil.test`,
  { headers: { Cookie: cookie }, redirect: 'manual' },
);
assert.equal(external.headers.get('location'), `${base}/`);
const getLogout = await fetch(`${base}/api/auth/logout`, {
  headers: { Cookie: cookie },
  redirect: 'manual',
});
assert.equal(getLogout.status, 405);
assert.deepEqual(getLogout.headers.getSetCookie(), []);
const rejectedLogout = await fetch(`${base}/api/auth/logout`, {
  method: 'POST',
  headers: { Origin: 'https://evil.test', Cookie: cookie },
});
assert.equal(rejectedLogout.status, 403);
assert.deepEqual(rejectedLogout.headers.getSetCookie(), []);
const logout = await fetch(`${base}/api/auth/logout`, {
  method: 'POST',
  headers: { Origin: base, Cookie: cookie },
});
assert.equal(logout.status, 200);
assert.equal(logout.headers.getSetCookie().length, 2);
assert.ok(
  logout.headers
    .getSetCookie()
    .every((value) => value.includes('1970') || /max-age=0/i.test(value)),
);
console.log(
  'Auth HTTP smoke passed: origin/content type, cookies, page reload, POST refresh, GET recovery, safe redirect, POST logout and GET rejection.',
);
