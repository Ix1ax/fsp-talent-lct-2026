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

const held = [];
let catalogsMode = 'hold';
let skillsMode = 'hold';
let delayFirstCompany = false;
const fulfill = (p, requestId, body, status = 200) =>
  p
    .call('Fetch.fulfillRequest', {
      requestId,
      responseCode: status,
      responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
      body: Buffer.from(JSON.stringify(body)).toString('base64'),
    })
    .catch(() => {});
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
    if (url.pathname.endsWith('/catalogs')) {
      if (catalogsMode === 'hold') held.push({ requestId, kind: 'catalogs' });
      else void fulfill(p, requestId, fixtures.catalogs);
      return;
    }
    if (url.pathname.endsWith('/catalogs/skills')) {
      if (skillsMode === 'hold') held.push({ requestId, kind: 'skills' });
      else {
        const q = url.searchParams.get('q') ?? '';
        assert.equal(url.searchParams.get('limit'), '50');
        assert.equal(url.searchParams.get('offset'), '0');
        void delay(q === 'slow' ? 1000 : 0).then(() =>
          fulfill(p, requestId, {
            items:
              q === 'fresh'
                ? [{ ...fixtures.skills[0], name: 'Fresh skill' }]
                : q === 'slow'
                  ? [{ ...fixtures.skills[0], name: 'Stale skill' }]
                  : fixtures.skills,
            limit: 50,
            offset: 0,
          }),
        );
      }
      return;
    }
    const match = url.pathname.match(
      /\/companies\/([^/]+)\/needs(?:\/([^/]+))?$/,
    );
    if (match && request.method === 'GET') {
      const companyId = match[1];
      const needs = fixtures.needs
        .filter((need) => need.company_id === companyId)
        .map((need) => ({
          ...need,
          title: `${companyId === fixtures.companies[0].id ? 'Первая' : 'Вторая'}: ${need.title}`,
        }));
      const offset = Number(url.searchParams.get('offset') ?? 0);
      const body = match[2]
        ? needs.find((need) => need.id === match[2])
        : {
            items: needs
              .filter(
                (need) =>
                  need.status === (url.searchParams.get('status') ?? 'active'),
              )
              .slice(offset, offset + 20),
            limit: 20,
            offset,
          };
      void delay(
        delayFirstCompany && companyId === fixtures.companies[0].id ? 1000 : 0,
      ).then(() => fulfill(p, requestId, body));
      return;
    }
    void p.call('Fetch.continueRequest', { requestId });
  });
  await p.call('Fetch.enable', {
    patterns: [
      { urlPattern: '*/api/v1/catalogs*', requestStage: 'Request' },
      { urlPattern: '*/api/v1/companies/*/needs*', requestStage: 'Request' },
    ],
  });
  await p.navigate('/login');
  await p.evaluate(
    `fetch('/api/auth/session', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({accessToken:'review-employer',refreshToken:'review-employer-refresh',expiresIn:900}) }).then(r => r.status)`,
  );
  const company2 = fixtures.companies[1];
  const selected = fixtures.needs.find(
    (need) => need.company_id === company2.id && need.status === 'draft',
  );
  await p.navigate(
    `/employer?company=${company2.id}&tab=draft&offset=20&need=${selected.id}`,
  );
  await p.until(
    `document.querySelector('[aria-label="Бриф потребности"] h2')?.textContent.includes('Вторая:')`,
  );
  assert.equal(
    await p.evaluate(`new URLSearchParams(location.search).get('company')`),
    company2.id,
  );
  assert.equal(
    await p.evaluate(`new URLSearchParams(location.search).get('tab')`),
    'draft',
  );
  assert.equal(
    await p.evaluate(`new URLSearchParams(location.search).get('offset')`),
    '20',
  );
  assert.equal(
    await p.evaluate(`new URLSearchParams(location.search).get('need')`),
    selected.id,
  );
  assert.ok(held.some(({ kind }) => kind === 'catalogs'));
  assert.ok(
    await p.evaluate(
      `!document.querySelector('button[aria-label^="Компания:"]').disabled`,
    ),
  );
  results.push(
    'companies and direct-link need visible while catalogs/skills are suspended; URL state restored',
  );
  await delay(300);
  assert.ok(held.some(({ kind }) => kind === 'skills'));
  for (const request of held.filter(({ kind }) => kind === 'catalogs'))
    await fulfill(
      p,
      request.requestId,
      { error: { code: 'unavailable', message: 'Catalog failure' } },
      503,
    );
  for (const request of held.filter(({ kind }) => kind === 'skills'))
    await fulfill(
      p,
      request.requestId,
      { error: { code: 'unavailable', message: 'Skill failure' } },
      503,
    );
  await p.until(
    `[...document.querySelectorAll('button')].some(b => b.textContent.includes('Повторить загрузку условий')) && [...document.querySelectorAll('button')].some(b => b.textContent.includes('Повторить загрузку навыков'))`,
  );
  assert.ok(
    await p.evaluate(
      `document.querySelector('[aria-label="Бриф потребности"] h2').textContent.includes('Вторая:')`,
    ),
  );
  const companyRequests = browserRequests.filter(
    ({ path }) => path === '/api/v1/companies',
  ).length;
  catalogsMode = 'success';
  skillsMode = 'success';
  await p.clickText('Повторить загрузку условий');
  await p.clickText('Повторить загрузку навыков');
  await p.until(
    `![...document.querySelectorAll('button')].some(b => b.textContent.includes('Повторить загрузку условий') || b.textContent.includes('Повторить загрузку навыков'))`,
  );
  assert.equal(
    browserRequests.filter(({ path }) => path === '/api/v1/companies').length,
    companyRequests,
  );
  results.push(
    'catalog failures do not hide companies/needs; resource retries do not reload companies',
  );
  await p.clickText('Изменить потребность');
  await p.evaluate(
    `[...document.querySelectorAll('button')].find(b => b.textContent.includes('Обязательные навыки')).click()`,
  );
  await p.until(`!!document.querySelector('input[aria-label="Поиск навыка"]')`);
  await p.type('input[aria-label="Поиск навыка"]', 'slow');
  await delay(400);
  await p.type('input[aria-label="Поиск навыка"]', 'fresh');
  await p.until(`document.body.textContent.includes('Fresh skill')`);
  await delay(1100);
  assert.ok(
    await p.evaluate(`!document.body.textContent.includes('Stale skill')`),
  );
  results.push(
    'bounded skill query search ignores late reply and retains selected skills',
  );
  await p.call('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Escape',
    code: 'Escape',
  });
  await p.clickText('Отмена');
  delayFirstCompany = true;
  const clickSelector = async (selector) => {
    const point = await p.evaluate(
      `(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`,
    );
    await p.call('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      button: 'left',
      clickCount: 1,
      ...point,
    });
    await p.call('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      button: 'left',
      clickCount: 1,
      ...point,
    });
  };
  const chooseCompany = async (name) => {
    await clickSelector('button[aria-label^="Компания:"]');
    await p.until(`!!document.querySelector('[role="menu"]')`);
    await p.evaluate(
      `[...document.querySelectorAll('[role="menuitem"]')].find(b => b.textContent.includes(${JSON.stringify(name)})).click()`,
    );
  };
  await chooseCompany(fixtures.companies[0].name);
  await delay(100);
  await chooseCompany(fixtures.companies[1].name);
  await p.until(
    `document.querySelector('[aria-label="Список потребностей"]').textContent.includes('Вторая:')`,
  );
  await delay(1100);
  assert.ok(
    await p.evaluate(
      `!document.querySelector('[aria-label="Список потребностей"]').textContent.includes('Первая:')`,
    ),
  );
  results.push(
    'quick company switch never displays the previous company reply',
  );
  await p.call('Fetch.disable');
  await post('/__review/reset', { scenario: 'empty' });
  await p.navigate('/employer');
  await p.until(
    `document.querySelector('h1')?.textContent === 'Начнём с компании'`,
  );
  results.push('empty companies show the company creation state');
  // Synthetic demo gateway exercises the same board/editor mutations without a live backend.
  await p.navigate('/demo/employer');
  await p.until(
    `!!document.querySelector('[aria-label="Список потребностей"]')`,
  );
  await p.evaluate(
    `[...document.querySelectorAll('[aria-label="Список потребностей"] button')].find(b => b.textContent.includes('Frontend-разработчик')).click()`,
  );
  await p.until(`!!document.querySelector('[aria-label="Бриф потребности"]')`);
  await p.clickText('Изменить потребность');
  await p.type('input[maxlength="200"]', 'Сохранённая потребность');
  await p.evaluate(
    `document.querySelector('[aria-label="Сохранение изменений"] button').click()`,
  );
  await p.until(
    `document.querySelector('[aria-label="Бриф потребности"] h2')?.textContent === 'Сохранённая потребность'`,
  );
  await clickSelector('button[aria-label="Ещё действия с потребностью"]');
  await p.until(`!!document.querySelector('[role="menu"]')`);
  await p.evaluate(
    `[...document.querySelectorAll('[role="menuitem"]')].find(b => b.textContent.includes('В архив')).click()`,
  );
  await p.until(`!!document.querySelector('[role="dialog"]')`);
  await p.evaluate(
    `[...document.querySelectorAll('[role="dialog"] button')].find(b => b.textContent.includes('В архив')).click()`,
  );
  await p.until(
    `[...document.querySelectorAll('button')].some(b => b.textContent.includes('Вернуть в черновики'))`,
  );
  await p.clickText('Вернуть в черновики');
  await p.until(`new URLSearchParams(location.search).get('tab') === 'draft'`);
  await p.until(
    `document.body.textContent.includes('Сохранённая потребность')`,
  );
  results.push(
    'saving, archiving and restoring work with independently loaded resources',
  );
  await p.clickText('Создать потребность');
  await p.until(`!!document.querySelector('[aria-label="Новая потребность"]')`);
  await p.type(
    '[aria-label="Новая потребность"] input[maxlength="200"]',
    'Новый черновик',
  );
  await p.type(
    '[aria-label="Новая потребность"] textarea',
    'Задачи нового черновика',
  );
  await p.evaluate(
    `[...document.querySelectorAll('[aria-label="Новая потребность"] button')].find(b => b.textContent.includes('Специализация')).click()`,
  );
  await p.until(
    `[...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Frontend')`,
  );
  await p.clickText('Frontend');
  await p.clickText('Сохранить черновик');
  await p.until(
    `document.querySelector('[aria-label="Бриф потребности"] h2')?.textContent === 'Новый черновик'`,
  );
  assert.equal(
    await p.evaluate(`new URLSearchParams(location.search).get('tab')`),
    'draft',
  );
  results.push(
    'new need draft can be created without waiting for unrelated resources',
  );
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log(JSON.stringify({ results, runtimeErrors: errors }, null, 2));
} finally {
  for (const browserContextId of contexts)
    await send('Target.disposeBrowserContext', { browserContextId });
  socket.close();
}
