import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
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
let respondToRequest;
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
  if (message.method === 'Fetch.requestPaused') {
    void respondToRequest(message.params, message.sessionId).catch((error) =>
      errors.push(error.message),
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
    throw new Error(
      `Not ready: ${expression}; state: ${JSON.stringify(await evaluate('({ path: location.pathname, body: document.body.innerText.slice(0, 1200) })'))}; runtime: ${JSON.stringify(errors)}`,
    );
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

const click = async (p, selector) => {
  const pos = await p.evaluate(
    `(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`,
  );
  await p.call('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    button: 'left',
    clickCount: 1,
    ...pos,
  });
  await p.call('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    button: 'left',
    clickCount: 1,
    ...pos,
  });
  await delay(200);
};
const reviewDirectory = await mkdtemp(
  path.join(tmpdir(), 'fsp-employer-review-'),
);
const documentPath = path.join(reviewDirectory, 'document.pdf');
await writeFile(documentPath, '%PDF-1.4\n% Synthetic review document\n%%EOF\n');
try {
  await post('/__review/reset', { scenario: 'large' });
  const p = await createPage();
  await p.navigate('/login');
  assert.equal(
    await p.evaluate(
      `fetch('/api/auth/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken:'review-employer',refreshToken:'review-employer-refresh',expiresIn:900})}).then(r=>r.status)`,
    ),
    200,
  );
  const c1 = fixtures.companies[0],
    c2 = fixtures.companies[1];
  await p.navigate('/employer/profile?company=' + c1.id);
  await p.until(
    `!!document.querySelector('button[aria-label="Компания: ${c1.name}"]')`,
  );
  await delay(800);
  let ledger = await (await fetch(api + '/__review/requests')).json();
  assert.equal(
    ledger.filter((r) => /\/(files|members|invitations)$/.test(r.path)).length,
    0,
    'Hidden documents and team must not load',
  );
  assert.ok(
    ledger.filter((r) => r.path === `/api/v1/companies/${c1.id}/needs`)
      .length <= 1,
    'Profile must not duplicate needs requests',
  );
  await p.evaluate(
    `document.querySelector('a[href^="/employer/documents"]').click()`,
  );
  await p.until(`location.pathname==='/employer/documents'`);
  await click(p, `button[aria-label="Компания: ${c1.name}"]`);
  await p.until(`!!document.querySelector('[role="menuitem"]')`);
  await p.evaluate(
    `[...document.querySelectorAll('[role="menuitem"]')].find(e=>e.textContent.includes(${JSON.stringify(c2.name)})).click()`,
  );
  await p.until(
    `!!document.querySelector('button[aria-label="Компания: ${c2.name}"]')`,
  );
  await p.evaluate('history.back()');
  await p.until(
    `location.pathname==='/employer/profile' && !!document.querySelector('button[aria-label="Компания: ${c1.name}"]')`,
  );
  assert.ok((await p.evaluate('location.search')).includes(c1.id));
  results.push(
    'Back restores company and UI together; hidden resources stay idle',
  );
  const n = fixtures.needs.find(
    (n) => n.company_id === c1.id && n.status === 'active',
  );
  await p.navigate('/employer/vacancies?company=' + c1.id + '&need=' + n.id);
  await p.until(
    `[...document.querySelectorAll('section[aria-label="Потребности"] input')].some(i=>i.value===${JSON.stringify(n.title)})`,
  );
  await p.evaluate(
    `[...document.querySelectorAll('section[aria-label="Потребности"] input')].find(i=>i.value===${JSON.stringify(n.title)}).id='review-title'`,
  );
  await p.type('#review-title', 'Changed unsaved title');
  const before = dialogs.length;
  await click(p, 'button[aria-label="Ещё действия с потребностью"]');
  await p.until(`!!document.querySelector('[role="menuitem"]')`);
  await p.evaluate(
    `[...document.querySelectorAll('[role="menuitem"]')].find(e=>e.textContent.includes('В архив')).click()`,
  );
  await p.until(
    `document.querySelector('[role="dialog"]')?.textContent.includes('Перенести потребность')`,
  );
  await p.clickText('Отмена');
  assert.equal(
    dialogs.length,
    before,
    'Opening and cancelling archive does not discard draft',
  );
  await p.evaluate(`document.querySelector('a[href="/guides"]').click()`);
  await delay(400);
  assert.equal(dialogs.length, before + 1);
  assert.equal(await p.evaluate('location.pathname'), '/employer/vacancies');
  assert.equal(
    await p.evaluate(`document.querySelector('#review-title').value`),
    'Changed unsaved title',
  );
  acceptDialog = true;
  await p.evaluate(`document.querySelector('a[href="/guides"]').click()`);
  await p.until(`location.pathname==='/guides'`);
  assert.equal(dialogs.length, before + 2, 'One confirmation per departure');
  results.push('Archive cancellation retains input and departure guard');
  acceptDialog = false;
  await p.navigate('/employer/invitation?company=' + c1.id);
  await p.until(`!!document.querySelector('input[name="token"]')`);
  await p.type('input[name="token"]', 'unsaved-invitation-token');
  const invitationDialogs = dialogs.length;
  await p.evaluate(
    `document.querySelector('a[href^="/employer/vacancies"]').click()`,
  );
  await delay(400);
  assert.equal(await p.evaluate('location.pathname'), '/employer/invitation');
  assert.equal(
    await p.evaluate(`document.querySelector('input[name="token"]').value`),
    'unsaved-invitation-token',
  );
  assert.equal(dialogs.length, invitationDialogs + 1);
  results.push('Invitation cancellation preserves token');
  acceptDialog = true;
  await p.evaluate(
    `document.querySelector('a[href^="/employer/vacancies"]').click()`,
  );
  await p.until(`location.pathname==='/employer/vacancies'`);
  acceptDialog = false;
  await p.navigate('/employer/documents?company=' + c1.id);
  await p.until(`!!document.querySelector('input[type="file"]')`);
  const doc = await p.call('DOM.getDocument');
  const fileInput = await p.call('DOM.querySelector', {
    nodeId: doc.root.nodeId,
    selector: 'input[type="file"]',
  });
  await p.call('DOM.setFileInputFiles', {
    nodeId: fileInput.nodeId,
    files: [documentPath],
  });
  await delay(200);
  const fileDialogs = dialogs.length;
  await p.evaluate(
    `document.querySelector('a[href^="/employer/profile"]').click()`,
  );
  await p.until(`location.pathname==='/employer/profile'`);
  assert.equal(
    dialogs.length,
    fileDialogs,
    'Retained document form must not warn between sections',
  );
  await p.evaluate(`document.querySelector('a[href="/guides"]').click()`);
  await delay(400);
  assert.equal(await p.evaluate('location.pathname'), '/employer/profile');
  assert.equal(dialogs.length, fileDialogs + 1);
  assert.equal(
    await p.evaluate(
      `document.querySelector('input[type="file"]').files.length`,
    ),
    1,
  );
  results.push(
    'Selected document survives section navigation and guards departure',
  );
  acceptDialog = true;
  await p.evaluate(`document.querySelector('a[href="/guides"]').click()`);
  await p.until(`location.pathname==='/guides'`);
  acceptDialog = false;
  await p.navigate('/employer/vacancies?company=' + c1.id);
  await p.until(
    `[...document.querySelectorAll('label')].some(l=>l.textContent.trim().startsWith('Навык')&&l.querySelector('button[role="combobox"]'))`,
  );
  await p.evaluate(
    `[...document.querySelectorAll('label')].find(l=>l.textContent.trim().startsWith('Навык')&&l.querySelector('button[role="combobox"]')).querySelector('button').id='review-skill'`,
  );
  await click(p, '#review-skill');
  await p.until(`!!document.querySelector('input[aria-label="Поиск навыка"]')`);
  await p.type('input[aria-label="Поиск навыка"]', 'Навык 51');
  await p.until(
    `[...document.querySelectorAll('[cmdk-item]')].some(e=>e.textContent.trim()==='Навык 51')`,
  );
  await p.evaluate(
    `[...document.querySelectorAll('[cmdk-item]')].find(e=>e.textContent.trim()==='Навык 51').click()`,
  );
  await p.until(
    `document.querySelector('#review-skill').textContent.includes('Навык 51')`,
  );
  await click(p, '#review-skill');
  await p.until(`!!document.querySelector('input[aria-label="Поиск навыка"]')`);
  await p.type('input[aria-label="Поиск навыка"]', 'SQL');
  await p.until(
    `[...document.querySelectorAll('[cmdk-item]')].some(e=>e.textContent.trim()==='SQL')`,
  );
  await p.call('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27,
  });
  await p.call('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27,
  });
  assert.ok(
    (
      await p.evaluate(`document.querySelector('#review-skill').textContent`)
    ).includes('Навык 51'),
    'Selected label survives another search',
  );
  results.push('Server search finds skill 51 and retains its selected label');
  await p.navigate('/employer/vacancies?company=' + c1.id + '&need=' + n.id);
  await p.until(
    `[...document.querySelectorAll('section[aria-label="Потребности"] input')].some(i=>i.value===${JSON.stringify(n.title)})`,
  );
  await p.evaluate(
    `[...document.querySelectorAll('section[aria-label="Потребности"] input')].find(i=>i.value===${JSON.stringify(n.title)}).id='review-save-title'`,
  );
  await p.type('#review-save-title', 'Retryable saved title');
  let saves = 0;
  respondToRequest = async ({ requestId, request }, sessionId) => {
    if (request.method !== 'PATCH')
      return send('Fetch.continueRequest', { requestId }, sessionId);
    saves++;
    await delay(400);
    const body =
      saves === 1
        ? {
            error: { code: 'validation_error', message: 'Review save failure' },
          }
        : { ...n, ...JSON.parse(request.postData) };
    await send(
      'Fetch.fulfillRequest',
      {
        requestId,
        responseCode: saves === 1 ? 400 : 200,
        responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
        body: Buffer.from(JSON.stringify(body)).toString('base64'),
      },
      sessionId,
    );
  };
  await p.call('Fetch.enable', {
    patterns: [
      {
        urlPattern: app + '/api/v1/companies/' + c1.id + '/needs/' + n.id,
        requestStage: 'Request',
      },
    ],
  });
  await p.evaluate(
    `(()=>{const button=[...document.querySelectorAll('section[aria-label="Потребности"] button')].find(b=>b.textContent.trim()==='Сохранить и продолжить');button.click();button.click()})()`,
  );
  await p.until(`document.body.innerText.includes('Review save failure')`);
  assert.equal(saves, 1, 'Repeated click cannot start a parallel mutation');
  assert.equal(
    await p.evaluate(`document.querySelector('#review-save-title').value`),
    'Retryable saved title',
  );
  assert.equal(
    await p.evaluate(
      `[...document.querySelectorAll('section[aria-label="Потребности"] button')].find(b=>b.textContent.trim()==='Сохранить и продолжить').disabled`,
    ),
    false,
  );
  await p.clickText('Сохранить и продолжить');
  await p.until(`document.body.innerText.includes('Изменения сохранены')`);
  assert.equal(saves, 2);
  await p.call('Fetch.disable');
  const savedDialogs = dialogs.length;
  await p.evaluate(`document.querySelector('a[href="/guides"]').click()`);
  await p.until(`location.pathname==='/guides'`);
  assert.equal(
    dialogs.length,
    savedDialogs,
    'Successful save clears dirty state',
  );
  results.push(
    'Save failure preserves input, releases busy state and supports retry; double click sends one mutation',
  );
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({ passed: results, runtimeErrors: errors }, null, 2),
  );
} finally {
  for (const browserContextId of contexts)
    await send('Target.disposeBrowserContext', { browserContextId });
  socket.close();
  await rm(reviewDirectory, { recursive: true, force: true });
}
