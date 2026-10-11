import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createOidcManager } from '@/shared/auth';

import { startOidcLogin } from '../startOidcLogin';

vi.mock('@/shared/api/authConfig', () => ({
  getAuthConfig: vi.fn(async () => ({
    issuer: 'https://id.test',
    clientId: 'fsp-web',
  })),
}));

const signinRedirectMock = vi.fn();
vi.mock('@/shared/auth', () => ({
  createOidcManager: vi.fn(() => ({
    signinRedirect: signinRedirectMock,
  })),
}));

describe('startOidcLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initiates signin redirect without data when next is not provided', async () => {
    await startOidcLogin();
    expect(createOidcManager).toHaveBeenCalledWith(
      'https://id.test',
      'fsp-web',
    );
    expect(signinRedirectMock).toHaveBeenCalledWith(undefined);
  });

  it('passes sanitized next path in data to signin redirect', async () => {
    await startOidcLogin('/candidate/profile');
    expect(signinRedirectMock).toHaveBeenCalledWith({
      state: { next: '/candidate/profile' },
    });
  });

  it('sanitizes external redirect URL', async () => {
    await startOidcLogin('https://evil.test/hack');
    expect(signinRedirectMock).toHaveBeenCalledWith({
      state: { next: '/' },
    });
  });
});
