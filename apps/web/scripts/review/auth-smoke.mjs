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
assert.equal(
  new URL(recovery.headers.get('location'), base).href,
  `${base}/candidate/profile`,
);
const external = await fetch(
  `${base}/api/auth/refresh?next=https://evil.test`,
  { headers: { Cookie: cookie }, redirect: 'manual' },
);
assert.equal(new URL(external.headers.get('location'), base).href, `${base}/`);

// Guest redirect preserves the target through login or session recovery.
const guest = await fetch(`${base}/candidate/profile`, { redirect: 'manual' });
const guestTarget = '/login?next=%2Fcandidate';
const recoveryTarget = '/api/auth/refresh?next=%2Fcandidate';
if (guest.status === 307) {
  assert.ok(
    [
      guestTarget,
      `${base}${guestTarget}`,
      recoveryTarget,
      `${base}${recoveryTarget}`,
    ].includes(guest.headers.get('location')),
  );
} else {
  assert.equal(guest.status, 200);
  const text = await guest.text();
  assert.ok(
    text.includes('NEXT_REDIRECT') &&
      (text.includes(guestTarget) || text.includes(recoveryTarget)),
  );
}

// Cross-role redirect routes to appropriate home route
const crossRole = await fetch(`${base}/employer`, {
  headers: { Cookie: cookie },
  redirect: 'manual',
});
if (crossRole.status === 307) {
  assert.ok(
    ['/candidate', `${base}/candidate`].includes(
      crossRole.headers.get('location'),
    ),
  );
} else {
  assert.equal(crossRole.status, 200);
  const text = await crossRole.text();
  assert.ok(text.includes('NEXT_REDIRECT') && text.includes('/candidate'));
}

// Invalid refresh token redirects to login with next and clears cookies
const invalidRefresh = await fetch(
  `${base}/api/auth/refresh?next=/candidate/profile`,
  {
    headers: { Cookie: 'refresh_token=invalid' },
    redirect: 'manual',
  },
);
assert.equal(invalidRefresh.status, 307);
assert.equal(
  new URL(invalidRefresh.headers.get('location'), base).href,
  `${base}/login?next=%2Fcandidate%2Fprofile`,
);
assert.ok(
  invalidRefresh.headers.getSetCookie().some((c) => /max-age=0|1970/i.test(c)),
);

// 503 fault does not clear cookies or redirect to login, and recovery restores profile
const api = process.env.REVIEW_API_URL ?? 'http://127.0.0.1:5191';
await fetch(`${api}/__review/faults`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify([{ path: '/api/v1/me', status: 503, times: 1 }]),
});
const failed = await fetch(`${base}/candidate/profile`, {
  headers: { Cookie: cookie },
  redirect: 'manual',
});
assert.notEqual(failed.status, 307);
assert.notEqual(failed.status, 302);
assert.deepEqual(failed.headers.getSetCookie(), []);
const failedText = await failed.text();
assert.ok(
  failedText.includes('недоступен') ||
    failedText.includes('ошибка') ||
    failedText.includes('Повторить'),
);

const recovered = await fetch(`${base}/candidate/profile`, {
  headers: { Cookie: cookie },
  redirect: 'manual',
});
assert.equal(recovered.status, 200);
assert.ok((await recovered.text()).includes('Профиль'));

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
  'Auth HTTP smoke passed: origin/content type, cookies, page reload, POST refresh, GET recovery, safe redirect, guest redirect, cross-role redirect, invalid refresh, 503 fault tolerance & recovery, POST logout and GET rejection.',
);
