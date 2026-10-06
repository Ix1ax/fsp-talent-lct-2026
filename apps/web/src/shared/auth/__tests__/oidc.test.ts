import { InMemoryWebStorage, User } from 'oidc-client-ts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearOidcUser, createOidcManager } from '../oidc';

describe('OIDC token storage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps tokens in memory instead of browser sessionStorage', async () => {
    const sessionStorage = new InMemoryWebStorage();
    vi.stubGlobal('localStorage', new InMemoryWebStorage());
    vi.stubGlobal('window', {
      location: { origin: 'https://app.test' },
      sessionStorage,
    });
    const manager = createOidcManager('https://id.test', 'fsp-web');
    const user = new User({
      access_token: 'access',
      refresh_token: 'refresh',
      token_type: 'Bearer',
      profile: {
        sub: 'user',
        iss: 'https://id.test',
        aud: 'fsp-web',
        exp: 9999999999,
        iat: 1,
      },
    });
    await manager.storeUser(user);
    expect((await manager.getUser())?.refresh_token).toBe('refresh');
    expect(sessionStorage.length).toBe(0);
    await clearOidcUser();
    expect(await manager.getUser()).toBeNull();
  });

  it('removes legacy persisted users while preserving authorization state', async () => {
    const removeItem = vi.fn();
    vi.stubGlobal('window', {
      sessionStorage: {
        'oidc.user:legacy': 'tokens',
        'oidc.state': 'keep',
        removeItem,
      },
    });
    await clearOidcUser();
    expect(removeItem).toHaveBeenCalledWith('oidc.user:legacy');
    expect(removeItem).toHaveBeenCalledTimes(1);
  });
});
