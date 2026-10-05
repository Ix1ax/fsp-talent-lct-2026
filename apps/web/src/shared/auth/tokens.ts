export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

/** Sent on all app requests (Server Components / middleware). */
export const ACCESS_TOKEN_COOKIE_PATH = '/';

/** Only sent to auth routes — keeps refresh token off regular navigations. */
export const REFRESH_TOKEN_COOKIE_PATH = '/api/auth';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type TokenRefreshResult = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
};
