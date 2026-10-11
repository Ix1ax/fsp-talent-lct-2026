import { sanitizeRedirectPath } from '@/shared/utils/sanitizeRedirectPath';

type ReturnPathStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const KEY = 'fsp.login-return-path';
export const rememberLoginReturnPath = (
  path: string | null,
  storage?: ReturnPathStorage,
) => {
  try {
    const store = storage ?? window.sessionStorage;
    const safe = sanitizeRedirectPath(path);
    if (safe === '/') store.removeItem(KEY);
    else store.setItem(KEY, safe);
    return true;
  } catch {
    return false;
  }
};
export const takeLoginReturnPath = (
  fallback: string,
  storage?: ReturnPathStorage,
) => {
  try {
    const store = storage ?? window.sessionStorage;
    const stored = store.getItem(KEY);
    store.removeItem(KEY);
    const safe = sanitizeRedirectPath(stored);
    const url = new URL(safe, 'https://app.invalid');
    // Return only to the current role's workspace, including invitation query parameters.
    if (url.pathname === fallback || url.pathname.startsWith(`${fallback}/`))
      return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
  return fallback;
};
