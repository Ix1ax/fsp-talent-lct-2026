import 'server-only';

import { cookies } from 'next/headers';

import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_COOKIE_PATH,
  type AuthTokens,
  ID_TOKEN_COOKIE,
  ID_TOKEN_COOKIE_PATH,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE_PATH,
} from './tokens';

const getBaseCookie = () => ({
  httpOnly: true,
  secure:
    process.env.SESSION_COOKIE_SECURE === 'false'
      ? false
      : process.env.SESSION_COOKIE_SECURE === 'true' ||
        process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
});

export const getAccessToken = async (): Promise<string | undefined> =>
  (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;

export const getRefreshToken = async (): Promise<string | undefined> =>
  (await cookies()).get(REFRESH_TOKEN_COOKIE)?.value;

export const getIdToken = async (): Promise<string | undefined> =>
  (await cookies()).get(ID_TOKEN_COOKIE)?.value;

export const setAuthTokens = async (
  tokens: AuthTokens & { expiresIn?: number; idToken?: string },
  options?: { refreshMaxAge?: number },
): Promise<void> => {
  const jar = await cookies();
  const baseCookie = getBaseCookie();
  const accessMaxAge = tokens.expiresIn ?? 60 * 15;

  jar.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...baseCookie,
    path: ACCESS_TOKEN_COOKIE_PATH,
    maxAge: accessMaxAge,
  });

  jar.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...baseCookie,
    path: REFRESH_TOKEN_COOKIE_PATH,
    maxAge: options?.refreshMaxAge ?? 60 * 60 * 24 * 30,
  });

  if (tokens.idToken)
    jar.set(ID_TOKEN_COOKIE, tokens.idToken, {
      ...baseCookie,
      path: ID_TOKEN_COOKIE_PATH,
      maxAge: options?.refreshMaxAge ?? 60 * 60 * 24 * 30,
    });
};

export const clearAuthTokens = async (): Promise<void> => {
  const jar = await cookies();
  jar.delete({ name: ACCESS_TOKEN_COOKIE, path: ACCESS_TOKEN_COOKIE_PATH });
  jar.delete({ name: REFRESH_TOKEN_COOKIE, path: REFRESH_TOKEN_COOKIE_PATH });
  jar.delete({ name: ID_TOKEN_COOKIE, path: ID_TOKEN_COOKIE_PATH });
};
