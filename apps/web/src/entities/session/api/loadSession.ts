import 'server-only';

import { cache } from 'react';

import { ApiError } from '@/shared/api/errors';
import { getTokenDisplayName } from '@/shared/auth/server';
import { getAccessToken, getRefreshToken } from '@/shared/auth/session.server';

import type { SessionState } from '../model';
import { getMe } from './getMe';

const getUnavailableSessionMessage = (error: ApiError) => {
  if (error.code === 'timeout') {
    return 'Превышено время ожидания ответа сервиса. Попробуйте обновить страницу.';
  }

  if (error.status === 503) {
    return 'Сервис временно недоступен. Ведутся технические работы.';
  }

  return 'Сервис кабинета временно недоступен. Попробуйте обновить страницу.';
};

export const loadSession = cache(async (): Promise<SessionState> => {
  const token = await getAccessToken();
  const refreshToken = await getRefreshToken();

  if (!token) {
    if (!refreshToken) return { kind: 'guest' };
    return {
      kind: 'invalid',
      reason: 'token_expired',
      message: 'Сессия истекла',
      hasRefreshToken: true,
    };
  }

  try {
    const user = await getMe();
    return {
      kind: 'user',
      user: { ...user, name: getTokenDisplayName(token) },
    };
  } catch (error) {
    const displayName = getTokenDisplayName(token);

    if (error instanceof ApiError) {
      if (error.status === 401 || error.code === 'unauthorized') {
        return {
          kind: 'invalid',
          reason: 'unauthorized',
          message: error.message || 'Сессия недействительна',
          hasRefreshToken: Boolean(refreshToken),
        };
      }

      if (error.status === 403 || error.code === 'forbidden') {
        return {
          kind: 'invalid',
          reason: 'forbidden',
          message: error.message || 'Доступ запрещён',
          hasRefreshToken: Boolean(refreshToken),
        };
      }

      if (
        error.code === 'timeout' ||
        error.code === 'network' ||
        error.status >= 500
      ) {
        return {
          kind: 'unavailable',
          code: error.code,
          status: error.status,
          retryAfter: error.retryAfter,
          message: getUnavailableSessionMessage(error),
          displayName,
        };
      }

      return {
        kind: 'unavailable',
        code: error.code,
        status: error.status,
        message: error.message || 'Ошибка сервиса',
        displayName,
      };
    }

    return {
      kind: 'unavailable',
      code: 'unknown',
      status: 0,
      message: 'Не удалось проверить сессию. Попробуйте обновить страницу.',
      displayName,
    };
  }
});
