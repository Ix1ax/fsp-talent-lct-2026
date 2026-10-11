export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
/** id_token нужен только для выхода: подсказка Keycloak, чтобы не спрашивать «Хотите выйти?». */
export const ID_TOKEN_COOKIE = 'id_token';

/** Sent on all app requests (Server Components / middleware). */
export const ACCESS_TOKEN_COOKIE_PATH = '/';

/** Only sent to auth routes — keeps refresh token off regular navigations. */
export const REFRESH_TOKEN_COOKIE_PATH = '/api/auth';
export const ID_TOKEN_COOKIE_PATH = '/api/auth';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type TokenRefreshResult = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
};
