'use client';

import { isAxiosError } from 'axios';

import {
  clearClientAccessToken,
  emitSessionExpired,
  getClientAccessToken,
  getClientSessionRevision,
  setClientAccessToken,
} from '@/shared/auth';

import { attachErrorInterceptor, createApi } from './base';
import { ApiError } from './errors';

export const clientApi = createApi({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? '/api',
});

let refreshPromise: Promise<string | null> | null = null;
let refreshRevision = -1;

const runRefreshRequest = async (revision: number): Promise<string | null> => {
  if (revision !== getClientSessionRevision())
    throw new DOMException('Auth state changed', 'AbortError');
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'same-origin',
    signal: AbortSignal.timeout(12_000),
  });

  if (revision !== getClientSessionRevision())
    throw new DOMException('Auth state changed', 'AbortError');

  if (response.status === 401) {
    clearClientAccessToken();
    return null;
  }
  if (!response.ok) {
    throw new ApiError(
      503,
      'Не удалось обновить сессию. Попробуйте ещё раз.',
      'auth_unavailable',
    );
  }

  const data: unknown = await response.json().catch(() => null);
  if (revision !== getClientSessionRevision())
    throw new DOMException('Auth state changed', 'AbortError');
  if (
    !data ||
    typeof data !== 'object' ||
    !('accessToken' in data) ||
    typeof data.accessToken !== 'string' ||
    !data.accessToken.trim()
  ) {
    throw new ApiError(
      503,
      'Сервис авторизации вернул некорректный ответ',
      'auth_unavailable',
    );
  }
  const token = data.accessToken;
  setClientAccessToken(token);
  return token;
};

const refreshClientAccessToken = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;

  const revision = getClientSessionRevision();
  if (!refreshPromise || refreshRevision !== revision) {
    refreshRevision = revision;
    const request = async (): Promise<string | null> => {
      if (typeof navigator !== 'undefined' && navigator.locks?.request) {
        return await navigator.locks.request('auth-refresh', () =>
          runRefreshRequest(revision),
        );
      }
      return runRefreshRequest(revision);
    };
    const pending = request().finally(() => {
      if (refreshPromise === pending) refreshPromise = null;
    });
    refreshPromise = pending;
  }
  return refreshPromise;
};

export const ensureClientAccessToken = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;

  const cached = getClientAccessToken();
  if (cached) return cached;

  return refreshClientAccessToken();
};

clientApi.interceptors.request.use((config) => {
  const token = getClientAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

clientApi.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    if (!isAxiosError(error)) {
      return Promise.reject(error);
    }

    const config = error.config;
    const status = error.response?.status;

    if (status !== 401 || !config || config._retry || config.skipAuthRefresh) {
      return Promise.reject(error);
    }

    config._retry = true;
    // A delayed 401 may belong to the token already replaced by another request.
    const currentToken = getClientAccessToken();
    const token =
      currentToken && config.headers.Authorization !== `Bearer ${currentToken}`
        ? currentToken
        : await refreshClientAccessToken();

    if (!token) {
      emitSessionExpired();
      return Promise.reject(
        new ApiError(401, 'Session expired', 'unauthorized'),
      );
    }

    config.headers.Authorization = `Bearer ${token}`;

    // Axios-interceptor должен вернуть полный response при повторе запроса.
    // eslint-disable-next-line consistency/api-response
    return clientApi.request(config);
  },
);

attachErrorInterceptor(clientApi);
