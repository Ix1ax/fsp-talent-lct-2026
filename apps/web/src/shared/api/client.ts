'use client';

import { isAxiosError } from 'axios';
import {
  clearClientAccessToken,
  emitSessionExpired,
  getClientAccessToken,
  setClientAccessToken,
} from '@/shared/auth';
import { attachErrorInterceptor, createApi } from './base';
import { ApiError } from './errors';

export const clientApi = createApi({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? '/api',
});

let refreshPromise: Promise<string | null> | null = null;

const runRefreshRequest = async (): Promise<string | null> => {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'same-origin',
  });

  if (!response.ok) {
    clearClientAccessToken();
    return null;
  }

  const data = (await response.json()) as { accessToken?: string };
  const token = data.accessToken ?? null;
  setClientAccessToken(token);
  return token;
};

const refreshClientAccessToken = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;

  const doRun = async () => {
    if (!refreshPromise) {
      refreshPromise = runRefreshRequest().finally(() => {
        refreshPromise = null;
      });
    }
    return refreshPromise;
  };

  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request('auth-refresh', doRun);
  }

  return doRun();
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
    const token = await refreshClientAccessToken();

    if (!token) {
      emitSessionExpired();
      return Promise.reject(
        new ApiError(401, 'Session expired', 'unauthorized'),
      );
    }

    config.headers.Authorization = `Bearer ${token}`;

    return clientApi.request(config);
  },
);

attachErrorInterceptor(clientApi);
