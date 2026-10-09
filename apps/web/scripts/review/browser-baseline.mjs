import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

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
const scenario = process.env.REVIEW_SCENARIO ?? 'filled';
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
    void send(
      'Page.handleJavaScriptDialog',
      { accept: true },
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
const summarize = (requests) =>
  Object.fromEntries(
    [...new Set(requests.map((r) => `${r.method} ${r.path}`))]
      .sort()
      .map((key) => [
        key,
        requests.filter((r) => `${r.method} ${r.path}` === key).length,
      ]),
  );
const results = [];
const contexts = [];
try {
  for (const role of ['candidate', 'employer', 'admin']) {
    await post('/__review/reset', { scenario });
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
        returnByValue: true,
      });
      if (result.exceptionDetails)
        throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    const until = async (expression) => {
      const deadline = Date.now() + 60000;
      while (Date.now() < deadline) {
        if (await evaluate(expression)) return;
        await delay(100);
      }
      throw new Error(`Condition not met: ${expression}`);
    };
    const navigate = async (route) => {
      await call('Page.navigate', { url: `${app}${route}` });
      await until('document.readyState === "complete"');
    };
    const measure = async (name, action, ready) => {
      console.log(`${role}: ${name}`);
      browserRequests.length = 0;
      const before = (await (await fetch(`${api}/__review/requests`)).json())
        .length;
      await action();
      await until(ready);
      await delay(1200);
      const requests = (
        await (await fetch(`${api}/__review/requests`)).json()
      ).slice(before);
      results.push({
        role,
        name,
        backend: summarize(requests),
        browser: summarize(browserRequests),
      });
    };
    await call('Page.enable');
    await call('Runtime.enable');
    await call('Network.enable');
    await call('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await navigate('/login');
    await delay(800);
    if (role === 'admin') {
      const session = {
        access_token: 'review-admin',
        token_type: 'Bearer',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        admin: createFixtures().admin,
      };
      await evaluate(
        `sessionStorage.setItem('fsp.admin.session', ${JSON.stringify(JSON.stringify(session))})`,
      );
      await measure(
        'open catalogs',
        () => navigate('/admin/catalogs'),
        "!!document.querySelector('input[type=search]') && !document.querySelector('[aria-busy=true]')",
      );
      await measure(
        'catalogs → templates',
        () =>
          evaluate(
            'document.querySelector(\'a[href="/admin/templates"]\').click()',
          ),
        "document.querySelector('h1')?.textContent === 'Шаблоны тестов' && !document.querySelector('[aria-busy=true]')",
      );
      await measure(
        'templates → questions',
        () =>
          evaluate(
            'document.querySelector(\'a[href="/admin/questions"]\').click()',
          ),
        "document.querySelector('h1')?.textContent === 'Банк заданий' && !document.querySelector('[aria-busy=true]')",
      );
    } else {
      assert.equal(
        await evaluate(
          `fetch('/api/auth/session', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({accessToken:'review-${role}',refreshToken:'review-${role}-refresh',expiresIn:900}) }).then(r=>r.status)`,
        ),
        200,
      );
      if (role === 'candidate') {
        await measure(
          'open profile',
          () => navigate('/candidate/profile'),
          '!!document.querySelector(\'nav[aria-label="Разделы профиля"]\')',
        );
        await measure(
          'profile → contacts',
          () =>
            evaluate(
              'document.querySelector(\'nav[aria-label="Разделы профиля"] a[href="/candidate/contacts"]\').click()',
            ),
          "location.pathname === '/candidate/contacts'",
        );
        await measure(
          'contacts → experience',
          () =>
            evaluate(
              'document.querySelector(\'nav[aria-label="Разделы профиля"] a[href="/candidate/experience"]\').click()',
            ),
          "location.pathname === '/candidate/experience'",
        );
        if (scenario !== 'empty') {
          await evaluate(
            'document.querySelector(\'nav[aria-label="Разделы профиля"] a[href="/candidate/profile"]\').click()',
          );
          await until("location.pathname === '/candidate/profile'");
          await delay(300);
          await evaluate(
            `(()=>{const input=document.getElementById('profile-headline');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Сохранённый локальный черновик');input.dispatchEvent(new Event('input',{bubbles:true}));})()`,
          );
          // Steps preserve mounted forms. Use the bottom action (programmatic navigation).
          await evaluate(
            "[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Продолжить без сохранения')).click()",
          );
          await until("location.pathname === '/candidate/contacts'");
          await delay(200);
          await evaluate(
            "[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Назад').click()",
          );
          await until("location.pathname === '/candidate/profile'");
          assert.equal(
            await evaluate("document.getElementById('profile-headline').value"),
            'Сохранённый локальный черновик',
          );
        }
      } else {
        await measure(
          'open employer',
          () => navigate('/employer'),
          scenario === 'empty'
            ? "document.body.innerText.includes('Создать компанию')"
            : "document.body.innerText.includes('Тестовая компания 1') && document.body.innerText.includes('Go-разработчик')",
        );
        if (scenario !== 'empty')
          await measure(
            'active → draft',
            () =>
              evaluate(
                "[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Черновики')).dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0}))",
              ),
            "location.search.includes('tab=draft')",
          );
      }
    }
    await send('Target.disposeBrowserContext', { browserContextId });
    contexts.pop();
  }
  assert.deepEqual(errors, []);
  const directory = path.resolve(
    process.env.REVIEW_OUTPUT_DIR ?? '/private/tmp/fsp-review',
  );
  await mkdir(directory, { recursive: true });
  const filename = path.join(directory, `requests-${scenario}.json`);
  await writeFile(
    filename,
    JSON.stringify(
      {
        scenario,
        mode: 'Next.js development; includes SSR, hydration and prefetch; warm local compiler',
        results,
        errors,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(filename);
  console.log(JSON.stringify(results, null, 2));
} finally {
  for (const id of contexts)
    await send('Target.disposeBrowserContext', { browserContextId: id });
  socket.close();
}
