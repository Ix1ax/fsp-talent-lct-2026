import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

import { createFixtures, fixtureId } from './fixtures.mjs';
import { createReviewOidc } from './oidc.mjs';

export const createMockApi = () => {
  const appOrigin = process.env.REVIEW_APP_URL ?? 'http://127.0.0.1:5185';
  const oidc = createReviewOidc(appOrigin);
  let fixtures = createFixtures();
  let faults = [];
  let requests = [];
  const json = (res, status, body) => {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify(body));
  };
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://127.0.0.1:${server.address().port}`);
      const path = url.pathname;
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const text = Buffer.concat(chunks).toString();
      const body =
        text && req.headers['content-type']?.includes('application/json')
          ? JSON.parse(text)
          : {};
      if (path === '/__review/reset' && req.method === 'POST') {
        fixtures = createFixtures(body.scenario);
        faults = [];
        requests = [];
        return json(res, 200, { ok: true });
      }
      if (path === '/__review/faults' && req.method === 'POST') {
        faults = body;
        return json(res, 200, { ok: true });
      }
      if (path === '/__review/requests') return json(res, 200, requests);
      // Never retain headers, tokens, cookies, or request bodies in the ledger.
      requests.push({
        method: req.method,
        path,
        query: path.startsWith('/oidc/') ? '' : url.search,
      });
      const fault = faults.find(
        (f) =>
          f.path === path &&
          (!f.method || f.method === req.method) &&
          f.times !== 0,
      );
      if (fault) {
        if (fault.times !== undefined) fault.times -= 1;
        if (fault.timeout) {
          req.socket.once('close', () => res.destroy());
          return;
        }
        if (fault.delayMs)
          await new Promise((resolve) => {
            const timer = setTimeout(resolve, fault.delayMs);
            res.once('close', () => {
              clearTimeout(timer);
              resolve();
            });
          });
        if (res.destroyed) return;
        if (fault.status)
          return json(res, fault.status, {
            error: {
              code:
                fault.code ??
                {
                  401: 'unauthorized',
                  403: 'forbidden',
                  409: 'conflict',
                  503: 'unavailable',
                }[fault.status],
              message: 'Тестовая ошибка',
            },
          });
      }
      const page = (items) => {
        const offset = Number(url.searchParams.get('offset') || 0),
          limit = Number(url.searchParams.get('limit') || 20);
        return {
          items: items.slice(offset, offset + limit),
          total: items.length,
          offset,
          limit,
        };
      };
      const role = req.headers.authorization?.includes('employer')
        ? 'employer'
        : 'candidate';
      if (path.startsWith('/oidc/')) return oidc(req, res, url, text, json);
      if (path === '/api/v1/auth/config')
        return json(res, 200, {
          issuer: `${url.origin}/oidc`,
          client_id: 'review',
        });
      if (path === '/api/v1/me')
        return json(res, 200, {
          id: fixtureId(90),
          sub: 'review-user',
          email: `${role}@example.test`,
          email_verified: true,
          status: 'active',
          role,
        });
      if (path === '/api/v1/catalogs') return json(res, 200, fixtures.catalogs);
      if (path === '/api/v1/catalogs/skills')
        return json(
          res,
          200,
          page(
            fixtures.skills.filter((s) =>
              s.name
                .toLowerCase()
                .includes((url.searchParams.get('q') ?? '').toLowerCase()),
            ),
          ),
        );
      if (path === '/api/v1/me/profile/full')
        return json(res, 200, fixtures.full);
      if (path === '/api/v1/me/profile') {
        if (req.method !== 'GET')
          fixtures.full.profile = {
            ...fixtures.full.profile,
            ...body,
            id: fixtureId(50),
          };
        return json(res, 200, fixtures.full.profile);
      }
      if (path === '/api/v1/me/profile/avatar')
        return json(res, 404, {
          error: { code: 'avatar_not_found', message: 'Нет аватара' },
        });
      if (path === '/api/v1/me/contacts')
        return json(res, 200, fixtures.full.contacts);
      if (path === '/api/v1/me/consents')
        return json(res, 200, fixtures.full.consents);
      if (path === '/api/v1/me/skills')
        return json(res, 200, { items: fixtures.full.skills });
      if (path === '/api/v1/me/experience')
        return json(res, 200, { items: fixtures.experience });
      if (path === '/api/v1/me/education')
        return json(res, 200, { items: fixtures.education });
      if (path === '/api/v1/companies')
        return json(res, 200, page(fixtures.companies));
      const needPath = path.match(
        /^\/api\/v1\/companies\/([^/]+)\/needs(?:\/([^/]+))?(\/candidates)?$/,
      );
      if (needPath) {
        if (needPath[3])
          return json(res, 200, {
            ...page([]),
            need_id: needPath[2],
            matching_mode: 'basic',
            unassessed_criteria: [],
          });
        if (needPath[2])
          return json(
            res,
            200,
            fixtures.needs.find((n) => n.id === needPath[2]),
          );
        return json(
          res,
          200,
          page(
            fixtures.needs.filter(
              (n) =>
                n.company_id === needPath[1] &&
                n.status === (url.searchParams.get('status') ?? 'active'),
            ),
          ),
        );
      }
      if (path === '/api/v1/admin/auth/me')
        return json(res, 200, fixtures.admin);
      if (path === '/api/v1/admin/auth/login')
        return json(res, 200, {
          access_token: 'review-admin',
          token_type: 'Bearer',
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          admin: fixtures.admin,
        });
      if (path === '/api/v1/admin/auth/logout') {
        res.writeHead(204);
        return res.end();
      }
      const catalog = path.match(/^\/api\/v1\/admin\/catalogs\/([^/]+)$/);
      if (catalog)
        return json(res, 200, page(fixtures.adminCatalogs[catalog[1]] ?? []));
      if (
        [
          '/api/v1/admin/assessments/questions',
          '/api/v1/admin/assessments/templates',
          '/api/v1/admin/catalogs/skills/pending',
        ].includes(path)
      )
        return json(res, 200, page([]));
      if (path === '/api/v1/admin/admins')
        return json(res, 200, page([fixtures.admin]));
      return json(res, 501, {
        error: {
          code: 'unmocked_endpoint',
          message: `No fixture: ${req.method} ${path}`,
        },
      });
    } catch {
      if (!res.headersSent)
        json(res, 500, {
          error: { code: 'mock_error', message: 'Invalid fixture request' },
        });
      else res.destroy();
    }
  });
  return server;
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const port = Number(process.env.REVIEW_API_PORT ?? 5191);
  createMockApi().listen(port, '127.0.0.1', () =>
    console.log(`Synthetic review API: http://127.0.0.1:${port}`),
  );
}
