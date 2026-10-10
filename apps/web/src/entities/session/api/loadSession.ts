import 'server-only';

import { cache } from 'react';

import { ApiError } from '@/shared/api/errors';
import { getTokenDisplayName } from '@/shared/auth/server';
import { getAccessToken, getRefreshToken } from '@/shared/auth/session.server';

import type { SessionUser } from '../model';
import { getMe } from './getMe';

export type SessionState =
  | { kind: 'guest' }
  | { kind: 'user'; user: SessionUser }
  | {
      kind: 'invalid';
      reason: 'unauthorized' | 'forbidden' | 'token_expired';
      message: string;
      hasRefreshToken?: boolean;
    }
  | {
      kind: 'unavailable';
      message: string;
      code: string;
      status: number;
      displayName?: string;
      retryAfter?: string;
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
          message:
            error.code === 'timeout'
              ? 'Превышено время ожидания ответа сервиса. Попробуйте обновить страницу.'
              : error.status === 503
                ? 'Сервис временно недоступен. Ведутся технические работы.'
                : 'Сервис кабинета временно недоступен. Попробуйте обновить страницу.',
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
