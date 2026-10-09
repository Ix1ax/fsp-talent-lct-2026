import { createHash, generateKeyPairSync, randomUUID, sign } from 'node:crypto';

// Local test identity provider. No real accounts, secrets, or remote redirects.
export const createReviewOidc = (appOrigin) => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  const codes = new Map();
  const claims = {
    sub: 'review-user',
    name: 'Тестовый Кандидат',
    email: 'candidate@example.test',
    email_verified: true,
  };
  const jwk = {
    ...publicKey.export({ format: 'jwk' }),
    kid: 'review',
    use: 'sig',
    alg: 'RS256',
  };
  return (req, res, url, body, json) => {
    const issuer = `${url.origin}/oidc`;
    if (req.headers.origin === appOrigin) {
      res.setHeader('Access-Control-Allow-Origin', appOrigin);
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization',
      );
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (url.pathname === '/oidc/.well-known/openid-configuration')
      return json(res, 200, {
        issuer,
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
        userinfo_endpoint: `${issuer}/userinfo`,
        jwks_uri: `${issuer}/jwks`,
        end_session_endpoint: `${issuer}/logout`,
        response_types_supported: ['code'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
        code_challenge_methods_supported: ['S256'],
        token_endpoint_auth_methods_supported: ['none'],
      });
    if (url.pathname === '/oidc/jwks') return json(res, 200, { keys: [jwk] });
    if (url.pathname === '/oidc/userinfo') return json(res, 200, claims);
    if (url.pathname === '/oidc/authorize') {
      if (
        url.searchParams.get('redirect_uri') !== `${appOrigin}/auth/callback` ||
        url.searchParams.get('code_challenge_method') !== 'S256'
      )
        return json(res, 400, { error: 'invalid_request' });
      const code = randomUUID();
      codes.set(code, {
        challenge: url.searchParams.get('code_challenge'),
        nonce: url.searchParams.get('nonce'),
      });
      const redirect = new URL('/auth/callback', appOrigin);
      redirect.searchParams.set('code', code);
      redirect.searchParams.set('state', url.searchParams.get('state') ?? '');
      res.writeHead(302, { Location: redirect.href });
      res.end();
      return;
    }
    if (url.pathname === '/oidc/logout') {
      if (url.searchParams.get('post_logout_redirect_uri') !== appOrigin)
        return json(res, 400, { error: 'invalid_request' });
      res.writeHead(302, { Location: appOrigin });
      res.end();
      return;
    }
    if (url.pathname === '/oidc/token') {
      const params = new URLSearchParams(body);
      if (params.get('grant_type') === 'refresh_token') {
        const token = params.get('refresh_token');
        if (token === 'invalid' || !token?.startsWith('review-')) {
          return json(res, 400, { error: 'invalid_grant' });
        }
        const role = token.includes('employer') ? 'employer' : 'candidate';
        return json(res, 200, {
          access_token: `review-${role}`,
          refresh_token: `review-${role}-refresh`,
          expires_in: 900,
        });
      }
      const code = params.get('code'),
        saved = codes.get(code);
      codes.delete(code);
      if (
        !saved ||
        params.get('redirect_uri') !== `${appOrigin}/auth/callback` ||
        createHash('sha256')
          .update(params.get('code_verifier') ?? '')
          .digest('base64url') !== saved.challenge
      )
        return json(res, 400, { error: 'invalid_grant' });
      const now = Math.floor(Date.now() / 1000);
      const header = Buffer.from(
        JSON.stringify({ alg: 'RS256', kid: 'review' }),
      ).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({
          ...claims,
          iss: issuer,
          aud: 'review',
          iat: now,
          exp: now + 900,
          ...(saved.nonce ? { nonce: saved.nonce } : {}),
        }),
      ).toString('base64url');
      const input = `${header}.${payload}`;
      const signature = sign(
        'RSA-SHA256',
        Buffer.from(input),
        privateKey,
      ).toString('base64url');
      return json(res, 200, {
        access_token: 'review-candidate',
        refresh_token: 'review-candidate-refresh',
        id_token: `${input}.${signature}`,
        token_type: 'Bearer',
        scope: 'openid profile email',
        expires_in: 900,
      });
    }
    return json(res, 404, { error: 'unknown_oidc_endpoint' });
  };
};
