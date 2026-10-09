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
let acceptDialog = false;
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
        path: url.pathname,
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
try {
  await post('/__review/reset', { scenario: 'filled' });
  const p = await createPage();
  await p.navigate('/admin');
  await p.until('!!document.querySelector("input[type=email]")');
  await p.evaluate(
    `sessionStorage.setItem('fsp.admin.session', ${JSON.stringify(
      JSON.stringify({
        access_token: 'review-admin',
        token_type: 'Bearer',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        admin: fixtures.admin,
      }),
    )})`,
  );
  await p.navigate('/admin/questions');
  await p.until('document.querySelector("h1")?.textContent === "Банк заданий"');
  await p.evaluate(
    'document.querySelector(\'a[href="/admin/questions/new"]\').click()',
  );
  await p.until('!!document.querySelector("textarea[name=text]")');
  await p.type('textarea[name=text]', 'Несохранённый вопрос');
  await delay(150);
  const start = dialogs.length;
  await p.evaluate(
    'document.querySelector(\'a[href="/admin/templates"]\').click()',
  );
  await delay(150);
  assert.equal(await p.evaluate('location.pathname'), '/admin/questions/new');
  assert.equal(
    await p.evaluate('document.querySelector("textarea[name=text]").value'),
    'Несохранённый вопрос',
  );
  assert.equal(dialogs.length, start + 1);
  await p.evaluate('history.back()');
  await delay(250);
  assert.equal(await p.evaluate('location.pathname'), '/admin/questions/new');
  assert.equal(
    await p.evaluate('document.querySelector("textarea[name=text]").value'),
    'Несохранённый вопрос',
  );
  assert.equal(dialogs.length, start + 2);
  await p.clickText('Отмена');
  await delay(150);
  assert.equal(dialogs.length, start + 3);
  assert.equal(await p.evaluate('location.pathname'), '/admin/questions/new');
  acceptDialog = true;
  await p.evaluate(
    'document.querySelector(\'a[href="/admin/templates"]\').click()',
  );
  await p.until('location.pathname === "/admin/templates"');
  assert.equal(dialogs.length, start + 4);
  await p.evaluate('history.back()');
  await p.until('!!document.querySelector("textarea[name=text]")');
  await p.type('textarea[name=text]', 'Черновик для Forward');
  await delay(150);
  acceptDialog = false;
  await p.evaluate('history.forward()');
  await delay(250);
  assert.equal(await p.evaluate('location.pathname'), '/admin/questions/new');
  assert.equal(
    await p.evaluate('document.querySelector("textarea[name=text]").value'),
    'Черновик для Forward',
  );
  results.push(
    'admin question: link/cancel/back/forward; retained input; single dialog',
  );
  // Reload must use the browser's beforeunload prompt and keep the draft on refusal.
  await p.call('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'ArrowRight',
    code: 'ArrowRight',
  });
  await p.call('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'ArrowRight',
    code: 'ArrowRight',
  });
  const beforeReload = dialogs.length;
  await p.call('Page.reload');
  await delay(250);
  assert.equal(dialogs.length, beforeReload + 1);
  assert.equal(dialogs.at(-1), 'beforeunload');
  assert.equal(
    await p.evaluate('document.querySelector("textarea[name=text]").value'),
    'Черновик для Forward',
  );
  results.push('reload: beforeunload refused, input retained');
  acceptDialog = true;
  await p.evaluate(
    'document.querySelector(\'a[href="/admin/catalogs"]\').click()',
  );
  await p.until('document.querySelector("h1")?.textContent === "Справочники"');
  await p.clickText('Добавить запись');
  await p.until('!!document.querySelector("input[name=code]")');
  await p.type('input[name=code]', 'review');
  await p.type('input[name=name]', 'Запись проверки');
  await delay(150);
  acceptDialog = false;
  const beforeEscape = dialogs.length;
  await p.call('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Escape',
    code: 'Escape',
  });
  await p.call('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Escape',
    code: 'Escape',
  });
  await delay(200);
  assert.equal(dialogs.length, beforeEscape + 1);
  assert.equal(
    await p.evaluate('document.querySelector("input[name=name]").value'),
    'Запись проверки',
  );
  assert.equal(await p.evaluate('document.activeElement.name'), 'name');
  await p.call('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: 5,
    y: 5,
    button: 'left',
    clickCount: 1,
  });
  await p.call('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: 5,
    y: 5,
    button: 'left',
    clickCount: 1,
  });
  await delay(200);
  assert.equal(dialogs.length, beforeEscape + 2);
  assert.equal(
    await p.evaluate('document.querySelector("input[name=name]").value'),
    'Запись проверки',
  );
  results.push(
    'catalog modal: Escape/outside click refused; input and focus retained',
  );
  let saveCalls = 0;
  const intercept = async (event) => {
    const data = JSON.parse(event.data);
    if (data.method !== 'Fetch.requestPaused' || data.sessionId !== p.sessionId)
      return;
    if (data.params.request.method !== 'POST') {
      await p.call('Fetch.continueRequest', {
        requestId: data.params.requestId,
      });
      return;
    }
    saveCalls++;
    const body =
      saveCalls === 1
        ? {
            error: {
              code: 'unavailable',
              message: 'Тестовая ошибка сохранения',
            },
          }
        : {
            id: 'review',
            code: 'review',
            name: 'Запись проверки',
            active: true,
          };
    await p.call('Fetch.fulfillRequest', {
      requestId: data.params.requestId,
      responseCode: saveCalls === 1 ? 503 : 200,
      responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
      body: Buffer.from(JSON.stringify(body)).toString('base64'),
    });
  };
  socket.addEventListener('message', intercept);
  await p.call('Fetch.enable', {
    patterns: [{ urlPattern: '*/api/v1/admin/catalogs/specializations' }],
  });
  await p.clickText('Сохранить');
  await p.until(
    'document.body.innerText.includes("Тестовая ошибка сохранения")',
  );
  assert.equal(
    await p.evaluate('document.querySelector("input[name=name]").value'),
    'Запись проверки',
  );
  await p.clickText('Сохранить');
  await p.until('!document.querySelector("input[name=code]")');
  assert.equal(saveCalls, 2);
  const beforeSavedLeave = dialogs.length;
  await p.evaluate(
    'document.querySelector(\'a[href="/admin/templates"]\').click()',
  );
  await p.until('location.pathname === "/admin/templates"');
  assert.equal(dialogs.length, beforeSavedLeave);
  await p.call('Fetch.disable');
  socket.removeEventListener('message', intercept);
  results.push(
    'failed save: preserved dirty input; resubmit succeeds; successful leave has no warning',
  );
  await p.evaluate(
    'document.querySelector(\'a[href="/admin/templates/new"]\').click()',
  );
  await p.until('!!document.querySelector("input[name=pass_score]")');
  await p.type('input[name=pass_score]', '75');
  const templateStart = dialogs.length;
  await p.clickText('Отмена');
  await delay(150);
  assert.equal(await p.evaluate('location.pathname'), '/admin/templates/new');
  assert.equal(dialogs.length, templateStart + 1);
  assert.equal(
    await p.evaluate('document.querySelector("input[name=pass_score]").value'),
    '75',
  );
  results.push('template editor: cancel refused, blueprint and score retained');
  const c = await createPage();
  await c.navigate('/login');
  await c.evaluate(
    `fetch('/api/auth/session', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ accessToken:'review-candidate', refreshToken:'review-candidate-refresh', expiresIn:900 }) }).then(r => r.status)`,
  );
  await c.navigate('/candidate/profile');
  await c.until('!!document.getElementById("profile-headline")');
  await delay(1000);
  await c.type('#profile-headline', 'Черновик профиля');
  const candidateStart = dialogs.length;
  await c.evaluate(
    'document.querySelector(\'nav a[href="/candidate/experience"]\').click()',
  );
  await c.until('location.pathname === "/candidate/experience"');
  await c.until(
    '[...document.querySelectorAll("button")].some(b => b.textContent.trim() === "Добавить место работы" && !b.disabled)',
  );
  await c.clickText('Добавить место работы');
  await c.until('!!document.querySelector("input[name=company]")');
  await c.type('input[name=company]', 'Черновик компании');
  await c.evaluate(
    'document.querySelector(\'nav a[href="/candidate/education"]\').click()',
  );
  await c.until('location.pathname === "/candidate/education"');
  await c.evaluate('history.back()');
  await c.until('location.pathname === "/candidate/experience"');
  assert.equal(dialogs.length, candidateStart);
  assert.equal(
    await c.evaluate('document.querySelector("input[name=company]").value'),
    'Черновик компании',
  );
  await c.evaluate('document.querySelector(\'a[href="/guides"]\').click()');
  await delay(200);
  assert.equal(dialogs.length, candidateStart + 1);
  assert.equal(await c.evaluate('location.pathname'), '/candidate/experience');
  assert.equal(
    await c.evaluate('document.getElementById("profile-headline").value'),
    'Черновик профиля',
  );
  assert.equal(
    await c.evaluate('document.querySelector("input[name=company]").value'),
    'Черновик компании',
  );
  results.push(
    'candidate: steps/back retain drafts without warning; two dirty forms prompt once on leave',
  );
  const e = await createPage();
  await e.navigate('/login');
  await e.evaluate(
    `fetch('/api/auth/session', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ accessToken:'review-employer', refreshToken:'review-employer-refresh', expiresIn:900 }) }).then(r => r.status)`,
  );
  await e.navigate(
    `/employer?company=${fixtures.companies[0].id}&tab=active&need=${fixtures.needs[0].id}`,
  );
  await e.until(
    '[...document.querySelectorAll("button")].some(b => b.textContent.trim() === "Изменить потребность" && !b.disabled)',
  );
  await e.clickText('Изменить потребность');
  await e.type(
    'section[aria-label="Бриф потребности"] input[maxlength="200"]',
    'Черновик потребности',
  );
  const employerStart = dialogs.length;
  await e.clickText('Отмена');
  await delay(150);
  assert.equal(dialogs.length, employerStart + 1);
  assert.equal(
    await e.evaluate(
      'document.querySelector(\'section[aria-label="Бриф потребности"] input[maxlength="200"]\').value',
    ),
    'Черновик потребности',
  );
  await e.clickText('Компания');
  await e.until(
    '!!document.querySelector(\'[data-slot="sheet-content"] input[maxlength="200"]\')',
  );
  assert.equal(dialogs.length, employerStart + 1);
  await e.type(
    '[data-slot="sheet-content"] input[maxlength="200"]',
    'Черновик компании',
  );
  await e.call('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Escape',
    code: 'Escape',
  });
  await e.call('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Escape',
    code: 'Escape',
  });
  await delay(200);
  assert.equal(dialogs.length, employerStart + 2);
  assert.equal(
    await e.evaluate(
      'document.querySelector(\'[data-slot="sheet-content"] input[maxlength="200"]\').value',
    ),
    'Черновик компании',
  );
  acceptDialog = true;
  await e.call('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Escape',
    code: 'Escape',
  });
  await e.call('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Escape',
    code: 'Escape',
  });
  await e.until('!document.querySelector(\'[data-slot="sheet-content"]\')');
  assert.equal(
    await e.evaluate(
      'document.querySelector(\'section[aria-label="Бриф потребности"] input[maxlength="200"]\').value',
    ),
    'Черновик потребности',
  );
  // The brand link delegates to a local navigation callback. Its two layers
  // must agree on one approval while the query string changes.
  const employerLeave = dialogs.length;
  await e.evaluate(
    'document.querySelector(\'a[aria-label="ФСП Скаут — потребности"]\').click()',
  );
  await e.until(
    '!document.querySelector(\'section[aria-label="Бриф потребности"]\')',
  );
  assert.equal(dialogs.length, employerLeave + 1);
  results.push(
    'employer: local cancel and Sheet Escape protected; company closes without losing need; link delegation prompts once',
  );
  console.log(JSON.stringify({ results, runtimeErrors: errors }, null, 2));
  assert.deepEqual(errors, []);
} finally {
  for (const browserContextId of contexts)
    await send('Target.disposeBrowserContext', { browserContextId });
  socket.close();
}
