import { getAuthConfig } from '@/shared/api/authConfig';
import { ApiError } from '@/shared/api/errors';
import {
  clearOidcUser,
  createOidcManager,
  setClientAccessToken,
} from '@/shared/auth';
import { getMeClient, type SessionUser } from '@/entities/session';

export type CompleteOidcCallbackResult =
  | { status: 'authenticated'; user: SessionUser }
  | { status: 'role_chooser' }
  | { status: 'inactive' }
  | { status: 'unauthorized' }
  | { status: 'error'; message: string };

let callbackUrl: string | undefined;
let callbackPromise: Promise<CompleteOidcCallbackResult> | undefined;

const runOidcCallback = async (
  url: string,
): Promise<CompleteOidcCallbackResult> => {
  try {
    const config = await getAuthConfig();
    const manager = createOidcManager(config.issuer, config.clientId);
    const user = await manager.signinCallback(url);
    await clearOidcUser();

    if (!user?.access_token) {
      return { status: 'error', message: 'Токен не получен от Keycloak' };
    }

    const sessionRes = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        accessToken: user.access_token,
        refreshToken: user.refresh_token ?? '',
        expiresIn: user.expires_in,
      }),
    });

    if (!sessionRes.ok) {
      return { status: 'error', message: 'Не удалось сохранить сессию' };
    }

    setClientAccessToken(user.access_token);

    try {
      const sessionUser = await getMeClient();
      return { status: 'authenticated', user: sessionUser };
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404 && err.code === 'not_registered') {
          return { status: 'role_chooser' };
        }
        if (err.status === 403 && err.code === 'user_inactive') {
          return { status: 'inactive' };
        }
        if (err.status === 401) {
          return { status: 'unauthorized' };
        }
      }

      return {
        status: 'error',
        message: err instanceof Error ? err.message : 'Неизвестная ошибка',
      };
    }
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Ошибка авторизации',
    };
  }
};

export const completeOidcCallback = (
  url: string,
): Promise<CompleteOidcCallbackResult> => {
  if (!callbackPromise || callbackUrl !== url) {
    callbackUrl = url;
    callbackPromise = runOidcCallback(url);
  }
  return callbackPromise;
};
