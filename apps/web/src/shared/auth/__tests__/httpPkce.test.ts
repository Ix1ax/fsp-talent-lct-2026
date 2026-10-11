import { InMemoryWebStorage, OidcClient } from 'oidc-client-ts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getHttpPkceArgs } from '../httpPkce';

const verifier = 'a'.repeat(86);
const challenge = 'b'.repeat(43);

afterEach(() => vi.unstubAllGlobals());

describe('PKCE on HTTP by IP', () => {
  it('sends S256 and persists the verifier for callback exchange without Web Crypto', async () => {
    vi.stubGlobal('window', {
      location: { protocol: 'http:' },
      crypto: { getRandomValues: crypto.getRandomValues.bind(crypto) },
    });
    vi.stubGlobal('localStorage', new InMemoryWebStorage());
    const tokenBody = vi.fn();
    const fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === '/api/auth/pkce')
        return Response.json({ verifier, challenge });
      tokenBody(options?.body);
      const now = Math.floor(Date.now() / 1000);
      const claims = {
        sub: 'qa',
        iss: 'http://id.test',
        aud: 'fsp-web',
        iat: now,
        exp: now + 300,
      };
      const idToken = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.qa`;
      return Response.json({
        access_token: 'qa-access',
        token_type: 'Bearer',
        id_token: idToken,
      });
    });
    vi.stubGlobal('fetch', fetch);
    const args = await getHttpPkceArgs();
    const client = new OidcClient({
      authority: 'http://id.test',
      client_id: 'fsp-web',
      redirect_uri: 'http://app.test/auth/callback',
      response_type: 'code',
      scope: 'openid',
      disablePKCE: true,
      metadata: {
        authorization_endpoint: 'http://id.test/auth',
        token_endpoint: 'http://id.test/token',
      },
    });
    const request = await client.createSigninRequest({
      ...args,
      skipUserInfo: true,
    });
    const url = new URL(request.url);
    expect(url.searchParams.getAll('code_challenge')).toEqual([challenge]);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(request.state.extraTokenParams?.code_verifier).toBe(verifier);
    expect(fetch).toHaveBeenCalledWith('/api/auth/pkce', { cache: 'no-store' });
    const response = await client.processSigninResponse(
      `http://app.test/auth/callback?state=${request.state.id}&code=qa-code`,
    );
    expect(response.access_token).toBe('qa-access');
    expect(
      new URLSearchParams(tokenBody.mock.calls[0][0]).get('code_verifier'),
    ).toBe(verifier);
  });

  it('keeps browser PKCE on HTTPS', async () => {
    vi.stubGlobal('window', { location: { protocol: 'https:' }, crypto });
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect(await getHttpPkceArgs()).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('stops login if the server fails', async () => {
    vi.stubGlobal('window', { location: { protocol: 'http:' } });
    vi.stubGlobal('fetch', async () => new Response(null, { status: 503 }));
    await expect(getHttpPkceArgs()).rejects.toThrow(
      'Не удалось подготовить вход',
    );
  });
});
