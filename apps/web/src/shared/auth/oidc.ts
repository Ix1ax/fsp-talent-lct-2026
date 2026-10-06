import {
  InMemoryWebStorage,
  UserManager,
  type UserManagerSettings,
  WebStorageStateStore,
} from 'oidc-client-ts';

export const getAppOrigin = (): string => {
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
    post_logout_redirect_uri: getAppOrigin(),
    response_type: 'code',
    disablePKCE: false,
    scope: 'openid profile email',
    automaticSilentRenew: false,
    userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
  };

  manager = new UserManager(settings);
  managerKey = key;

  return manager;
};

export const clearOidcUser = async (): Promise<void> => {
  if (manager) await manager.removeUser();
  if (typeof window === 'undefined') return;

  // Убираем токены, сохранённые предыдущей версией приложения.
  const storage = window.sessionStorage;
  for (const key of Object.keys(storage)) {
    if (key.startsWith('oidc.user:')) storage.removeItem(key);
  }
};
