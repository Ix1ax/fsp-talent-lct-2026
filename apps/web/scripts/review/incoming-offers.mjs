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
    `(()=>{const e=document.querySelector(${JSON.stringify(selector)});const bounds=e.getBoundingClientRect();if(bounds.top<0||bounds.bottom>innerHeight)e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`,
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
try {
  await post('/__review/reset', { scenario: 'filled' });
  const p = await createPage();
  const company = fixtures.companies[0];
  const offers = Array.from({ length: 20 }, (_, i) => ({
    id: 'offer-' + i,
    candidateId: 'candidate-' + i,
    companyId: company.id,
    companyName: company.name,
    title: 'Review offer ' + i,
    description: 'Synthetic conditions',
    salaryFromRub: 100000,
    salaryToRub: 200000,
    contactEmail: 'review@example.test',
    contactUrl: null,
    status: 'sent',
    createdAt: '2026-10-01T12:00:00Z',
    viewedAt: null,
    respondedAt: null,
    createdBy: 'review-user',
    needId: null,
  }));
  let listRequests = 0;
  let responses = 0;
  let failResponse = true;
  respondToRequest = async ({ requestId, request }, sessionId) => {
    const url = new URL(request.url);
    const parts = url.pathname.split('/');
    const action = parts.at(-1);
    let body;
    let responseCode = 200;
    if (action === 'offers') {
      if (!url.searchParams.has('status')) listRequests++;
      const items = offers.filter(
        (o) =>
          !url.searchParams.has('status') ||
          o.status === url.searchParams.get('status'),
      );
      body = { items, total: items.length, limit: 20, offset: 0 };
    } else {
      const item = offers.find(
        (o) =>
          o.id ===
          (['view', 'respond'].includes(action) ? parts.at(-2) : action),
      );
      if (action === 'view' && item.status === 'sent') item.status = 'viewed';
      if (action === 'respond') {
        responses++;
        if (failResponse) {
          responseCode = 400;
          body = {
            error: {
              code: 'validation_error',
              message: 'Review decision failure',
            },
          };
          failResponse = false;
        } else item.status = JSON.parse(request.postData).status;
      }
      body ??= item;
    }
    await send(
      'Fetch.fulfillRequest',
      {
        requestId,
        responseCode,
        responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
        body: Buffer.from(JSON.stringify(body)).toString('base64'),
      },
      sessionId,
    );
  };
  await p.call('Fetch.enable', {
    patterns: [
      { urlPattern: app + '/api/v1/me/offers*', requestStage: 'Request' },
    ],
  });
  await p.navigate('/login');
  await p.evaluate(
    `fetch('/api/auth/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken:'review-candidate',refreshToken:'review-candidate-refresh',expiresIn:900})}).then(r=>r.status)`,
  );
  await p.navigate('/candidate/offers');
  await p.until(`document.body.innerText.includes('Review offer 19')`);
  await delay(400);
  await p.evaluate(
    `[...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Посмотреть условия')[12].id='review-opener'`,
  );
  await click(p, '#review-opener');
  const opened = await p.evaluate('window.scrollY');
  await p.until(`!!document.querySelector('[role="dialog"]')`);
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
  await p.until(`!document.querySelector('[role="dialog"]')`);
  await delay(500);
  assert.equal(await p.evaluate('window.scrollY'), opened);
  assert.equal(await p.evaluate('document.activeElement.id'), 'review-opener');
  assert.equal(listRequests, 1);
  for (const mode of ['button', 'outside']) {
    await click(p, '#review-opener');
    await p.until(`!!document.querySelector('[role="dialog"]')`);
    const beforeClose = await p.evaluate('window.scrollY');
    if (mode === 'button')
      await p.evaluate(
        `document.querySelector('[data-slot="dialog-close"]').click()`,
      );
    else {
      await p.call('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        button: 'left',
        clickCount: 1,
        x: 8,
        y: 500,
      });
      await p.call('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        button: 'left',
        clickCount: 1,
        x: 8,
        y: 500,
      });
    }
    await p.until(`!document.querySelector('[role="dialog"]')`);
    await delay(350);
    assert.equal(await p.evaluate('window.scrollY'), beforeClose);
    assert.equal(
      await p.evaluate('document.activeElement.id'),
      'review-opener',
    );
    assert.equal(listRequests, 1);
  }
  await click(p, '#review-opener');
  await p.until(
    `document.querySelector('[role="dialog"]')?.textContent.includes('Принять предложение')`,
  );
  const beforeResponse = await p.evaluate('window.scrollY');
  await p.clickText('Принять предложение');
  await p.until(
    `document.querySelector('[role="dialog"]')?.textContent.includes('Review decision failure')`,
  );
  assert.equal(responses, 1);
  assert.ok(await p.evaluate(`!!document.querySelector('[role="dialog"]')`));
  await p.clickText('Принять предложение');
  await p.until(`!document.querySelector('[role="dialog"]')`);
  await delay(300);
  assert.equal(responses, 2);
  assert.equal(listRequests, 1);
  assert.equal(await p.evaluate('window.scrollY'), beforeResponse);
  assert.ok(
    await p.evaluate(
      `document.querySelector('#review-opener').closest('article').textContent.includes('Принято')`,
    ),
  );
  await p.call('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await p.call('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await p.evaluate(`document.documentElement.classList.add('dark')`);
  await delay(300);
  assert.ok(
    await p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),
  );
  await click(p, '#review-opener');
  await p.until(`!!document.querySelector('[role="dialog"]')`);
  assert.equal(
    await p.evaluate(
      `getComputedStyle(document.querySelector('[role="dialog"]')).animationName`,
    ),
    'none',
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
  await p.until(`!document.querySelector('[role="dialog"]')`);
  assert.equal(await p.evaluate('document.activeElement.id'), 'review-opener');
  assert.equal(listRequests, 1);
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        passed: [
          'Escape/close button/outside click retain scroll and focus without list refetch',
          'Viewing and responding patch the matching card',
          'Rejected response stays open and retries only on user click',
          'Mobile dark theme and reduced motion',
        ],
        runtimeErrors: errors,
      },
      null,
      2,
    ),
  );
} finally {
  for (const browserContextId of contexts)
    await send('Target.disposeBrowserContext', { browserContextId });
  socket.close();
}
