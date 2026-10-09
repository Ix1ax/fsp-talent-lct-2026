import assert from 'node:assert/strict';

import { createFixtures } from './fixtures.mjs';

const app = process.env.REVIEW_APP_URL ?? 'http://127.0.0.1:5185';
const api = process.env.REVIEW_API_URL ?? 'http://127.0.0.1:5191';
const cdp = process.env.REVIEW_CDP_URL ?? 'http://127.0.0.1:9224';
for (const value of [app, api, cdp]) {
  assert.ok(
    ['localhost', '127.0.0.1'].includes(new URL(value).hostname),
    'Review tools only target loopback hosts',
  );
}
const acceptDialog = true;
const dialogs = [];
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const post = (endpoint, body) =>
  fetch(`${api}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const version = await (await fetch(`${cdp}/json/version`)).json();
const socket = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});
let sequence = 0;
const pending = new Map();
const browserRequests = [];
const errors = [];
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  const waiting = pending.get(message.id);
  if (waiting) {
    clearTimeout(waiting.timer);
    pending.delete(message.id);
    if (message.error) waiting.reject(new Error(message.error.message));
    else waiting.resolve(message.result);
  }
  if (message.method === 'Page.javascriptDialogOpening') {
    dialogs.push(message.params.type);
    void send(
      'Page.handleJavaScriptDialog',
      { accept: acceptDialog },
      message.sessionId,
    );
  }
  if (message.method === 'Runtime.exceptionThrown')
    errors.push(message.params.exceptionDetails.text);
  if (message.method === 'Network.requestWillBeSent') {
    const url = new URL(message.params.request.url);
    if (url.origin === app && url.pathname.startsWith('/api/'))
      browserRequests.push({
        method: message.params.request.method,
        path: url.pathname + url.search,
      });
  }
});
const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`CDP timeout: ${method}`));
    }, 60000);
    pending.set(id, { resolve, reject, timer });
    socket.send(
      JSON.stringify({
        id,
        method,
        params,
        ...(sessionId ? { sessionId } : {}),
      }),
    );
  });
const contexts = [];
const results = [];
const fixtures = createFixtures();
const createPage = async () => {
  const { browserContextId } = await send('Target.createBrowserContext');
  contexts.push(browserContextId);
  const { targetId } = await send('Target.createTarget', {
    url: 'about:blank',
    browserContextId,
  });
  const { sessionId } = await send('Target.attachToTarget', {
    targetId,
    flatten: true,
  });
  const call = (method, params) => send(method, params, sessionId);
  const evaluate = async (expression) => {
    const result = await call('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      userGesture: true,
      returnByValue: true,
    });
    if (result.exceptionDetails)
      throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const until = async (expression) => {
    for (let i = 0; i < 300; i++) {
      if (await evaluate(expression)) return;
      await delay(100);
    }
    throw new Error(`Not ready: ${expression}`);
  };
  const navigate = async (route) => {
    await call('Page.navigate', { url: `${app}${route}` });
    await until('document.readyState === "complete"');
  };
  const type = async (selector, value) => {
    await evaluate(`(() => {
      const input = document.querySelector(${JSON.stringify(selector)});
      input.focus();
      input.select();
    })()`);
    await call('Input.insertText', { text: value });
    await delay(100);
  };
  const clickText = (text) =>
    evaluate(
      `[...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)}).click()`,
    );
  await call('Page.enable');
  await call('Runtime.enable');
  await call('Network.enable');
  await call('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  return { call, evaluate, until, navigate, type, clickText, sessionId };
};
const skill = (id, name, active = true) => ({
  id,
  code: id,
  name,
  active,
  moderation_status: 'approved',
});
const skillPages = [];
try {
  await post('/__review/reset', { scenario: 'filled' });
  const p = await createPage();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (
      message.method !== 'Fetch.requestPaused' ||
      message.sessionId !== p.sessionId
    )
      return;
    const { requestId, request } = message.params;
    const url = new URL(request.url);
    const kind = url.pathname.split('/').at(-1);
    let body;
    let status = 200;
    if (kind === 'skills') {
      const q = url.searchParams.get('q') ?? '';
      skillPages.push(q);
      const items =
        q === 'fresh'
          ? [skill('fresh', 'Fresh result')]
          : q === 'slow'
            ? [skill('slow', 'Stale result')]
            : [
                skill('chosen', 'Chosen skill'),
                ...Array.from({ length: 49 }, (_, i) =>
                  skill(`skill-${i}`, `Skill ${i}`),
                ),
              ];
      body = {
        items,
        limit: Number(url.searchParams.get('limit')),
        offset: 0,
        total: 10101,
      };
      void delay(q === 'slow' ? 1000 : 0)
        .then(() =>
          p.call('Fetch.fulfillRequest', {
            requestId,
            responseCode: status,
            body: Buffer.from(JSON.stringify(body)).toString('base64'),
            responseHeaders: [
              { name: 'Content-Type', value: 'application/json' },
            ],
          }),
        )
        .catch(() => {});
      return;
    }
    if (url.pathname.includes('/skills/')) {
      body = skill(
        kind,
        kind === 'chosen' ? 'Chosen skill' : `Selected ${kind}`,
      );
    } else if (kind === 'grades') {
      status = 503;
      body = { error: { code: 'unavailable', message: 'Grades unavailable' } };
    } else {
      body = {
        items: [{ id: '1', code: 'dev', name: 'Developer', active: true }],
        limit: 100,
        offset: 0,
      };
    }
    void p
      .call('Fetch.fulfillRequest', {
        requestId,
        responseCode: status,
        body: Buffer.from(JSON.stringify(body)).toString('base64'),
        responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
      })
      .catch(() => {});
  });
  await p.call('Fetch.enable', {
    patterns: [
      { urlPattern: '*/api/v1/admin/catalogs/*', requestStage: 'Request' },
    ],
  });
  await p.navigate('/admin');
  await p.until('!!document.querySelector("input[type=email]")');
  await p.evaluate(
    `sessionStorage.setItem('fsp.admin.session', ${JSON.stringify(JSON.stringify({ access_token: 'review-admin', token_type: 'Bearer', expires_at: new Date(Date.now() + 3600000).toISOString(), admin: fixtures.admin }))})`,
  );
  await p.navigate('/admin/questions');
  await p.until('document.querySelector("h1")?.textContent === "Банк заданий"');
  await delay(1000);
  assert.equal(skillPages.length, 1, 'Strict Mode shares one search');
  assert.ok(
    !browserRequests.some(({ path }) =>
      /catalogs\/(grades|specializations)/.test(path),
    ),
  );
  await p.evaluate(
    `document.querySelector('a[href="/admin/questions/new"]').click()`,
  );
  await p.until('!!document.querySelector("textarea[name=text]")');
  await delay(500);
  assert.equal(skillPages.length, 1, 'list to editor reuses skill search');
  await p.evaluate(`document.querySelector('button[role="combobox"]').click()`);
  await p.until('!!document.querySelector("[cmdk-input]")');
  await p.evaluate(
    '[...document.querySelectorAll("[cmdk-item]")].find(e => e.textContent.includes("Chosen skill")).click()',
  );
  await p.until(
    `document.querySelector('button[role="combobox"]').textContent.includes("Chosen skill")`,
  );
  await p.evaluate(`document.querySelector('button[role="combobox"]').click()`);
  await p.type('[cmdk-input]', 'slow');
  await delay(400);
  await p.type('[cmdk-input]', 'fresh');
  await p.until(
    '[...document.querySelectorAll("[cmdk-item]")].some(e => e.textContent.includes("Fresh result"))',
  );
  await delay(1100);
  assert.ok(
    await p.evaluate(
      '!document.querySelector("[cmdk-list]").textContent.includes("Stale result")',
    ),
  );
  assert.ok(
    await p.evaluate(
      `document.querySelector('button[role="combobox"]').textContent.includes("Chosen skill")`,
    ),
  );
  results.push(
    'bounded server search; selected label retained; late search ignored; Strict Mode and list/editor deduplication',
  );
  await p.call('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Escape',
    code: 'Escape',
  });
  await p.evaluate(
    `document.querySelector('a[href="/admin/templates"]').click()`,
  );
  await p.until(
    'document.querySelector("h1")?.textContent === "Шаблоны тестов"',
  );
  await delay(800);
  assert.ok(
    await p.evaluate(
      'document.body.textContent.includes("Grades unavailable")',
    ),
  );
  await p.evaluate(
    `document.querySelector('a[href="/admin/templates/new"]').click()`,
  );
  await p.until(
    'document.querySelector("h1")?.textContent === "Новый шаблон теста"',
  );
  await delay(500);
  assert.ok(
    await p.evaluate(
      'document.body.textContent.includes("Grades unavailable")',
    ),
  );
  const specializationCalls = browserRequests.filter(({ path }) =>
    path.includes('/catalogs/specializations'),
  ).length;
  assert.equal(
    specializationCalls,
    1,
    'successful catalog reused despite another catalog error',
  );
  assert.ok(
    await p.evaluate(
      '[...document.querySelectorAll("button[role=combobox]")].some(e => e.textContent.includes("Выберите значение") && !e.disabled)',
    ),
  );
  results.push(
    'catalog errors independent; successful specialization reused in editor',
  );
  for (const section of [
    'catalogs',
    'moderation',
    'questions',
    'templates',
    'admins',
  ]) {
    await p.navigate(`/admin/${section}`);
    await p.until('!!document.querySelector("main h1")');
    assert.notEqual(
      await p.evaluate('document.querySelector("main h1").textContent'),
      '404',
      section,
    );
  }
  for (const section of ['unknown', 'constructor', 'toString', '__proto__']) {
    for (const headers of [{}, { RSC: '1' }]) {
      const result = await fetch(`${app}/admin/${section}`, { headers });
      const text = await result.text();
      assert.ok(
        result.status === 404 || text.includes('NEXT_HTTP_ERROR_FALLBACK;404'),
      );
    }
  }
  results.push(
    'existing sections open; unknown and prototype keys return 404 for HTML and RSC requests',
  );
  assert.equal(errors.length, 0, `Runtime errors: ${JSON.stringify(errors)}`);
  console.log(
    JSON.stringify({ results, dialogs, runtimeErrors: errors }, null, 2),
  );
} finally {
  for (const browserContextId of contexts)
    await send('Target.disposeBrowserContext', { browserContextId });
  socket.close();
}
