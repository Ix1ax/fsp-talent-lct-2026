import { UserManager, type UserManagerSettings } from 'oidc-client-ts';

export const getAppOrigin = (): string => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

export const getCallbackUri = (): string => `${getAppOrigin()}/auth/callback`;

let manager: UserManager | null = null;
let managerKey = '';

export const createOidcManager = (
  issuer: string,
  clientId: string,
): UserManager => {
  const redirectUri = getCallbackUri();
  const key = `${issuer}::${clientId}::${redirectUri}`;
  if (manager && managerKey === key) return manager;

  const settings: UserManagerSettings = {
    authority: issuer,
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid profile email',
    automaticSilentRenew: false,
  };

  manager = new UserManager(settings);
  managerKey = key;

  return manager;
};
