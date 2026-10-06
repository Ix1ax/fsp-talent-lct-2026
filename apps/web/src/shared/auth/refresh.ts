import 'server-only';

import { ApiError } from '@/shared/api/errors';

import type { TokenRefreshResult } from './tokens';

export const refreshAuthTokens = async (
  refreshToken: string,
): Promise<TokenRefreshResult | null> => {
  const tokenUrl = process.env.OIDC_TOKEN_URL;
  const clientId = process.env.OIDC_CLIENT_ID;

  if (!tokenUrl || !clientId) {
    throw new ApiError(
      503,
      'Обновление сессии не настроено',
      'auth_unavailable',
    );
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  });

  let response: Response;
  try {
    response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ApiError(
      503,
      'Сервис авторизации временно недоступен',
      'auth_unavailable',
    );
  }

  const data = (await response.json().catch(() => null)) as {
    error?: string;
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  } | null;

  if (!response.ok) {
    if (response.status === 400 && data?.error === 'invalid_grant') return null;
    throw new ApiError(
      503,
      'Сервис авторизации временно недоступен',
      'auth_unavailable',
    );
  }
  if (
    !data ||
    typeof data.access_token !== 'string' ||
    !data.access_token ||
    (data.refresh_token !== undefined &&
      (typeof data.refresh_token !== 'string' || !data.refresh_token)) ||
    (data.expires_in !== undefined &&
      (!Number.isSafeInteger(data.expires_in) || data.expires_in <= 0))
  ) {
    throw new ApiError(
      503,
      'Сервис авторизации вернул некорректный ответ',
      'auth_unavailable',
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
};
