import axios, {
  type AxiosInstance,
  type CreateAxiosDefaults,
  isAxiosError,
  isCancel,
} from 'axios';

import {
  convertCamelToSnake,
  convertSnakeToCamel,
  isObject,
} from '@/shared/utils';

import { ApiError, toApiError } from './errors';

export const attachErrorInterceptor = (instance: AxiosInstance): void => {
  instance.interceptors.response.use(
    (res) => res,
    (error: unknown) => {
      if (isCancel(error)) {
        return Promise.reject(error);
      }

      if (error instanceof ApiError) {
        return Promise.reject(error);
      }

      if (!isAxiosError(error)) {
        return Promise.reject(
          toApiError(
            0,
            undefined,
            error instanceof Error ? error.message : 'Unknown error',
          ),
        );
      }

      if (!error.response) {
        const code =
          error.code === 'ECONNABORTED' || /timeout/i.test(error.message)
            ? 'timeout'
            : 'network';

        return Promise.reject(
          new ApiError(0, error.message || 'Network error', code),
        );
      }

      return Promise.reject(
        toApiError(
          error.response.status,
          error.response.data,
          error.message,
          error.response.headers,
        ),
      );
    },
  );
};

export const createApi = (config: CreateAxiosDefaults): AxiosInstance => {
  const instance = axios.create({
    timeout: 10_000,
    ...config,
  });

  instance.interceptors.request.use((req) => {
    if (isObject(req.data) || Array.isArray(req.data)) {
      req.data = convertCamelToSnake(req.data);
    }

    if (isObject(req.params)) {
      req.params = convertCamelToSnake(req.params);
    }

    return req;
  });

  instance.interceptors.response.use((res) => {
    const responseType = res.config.responseType;
    if (responseType && responseType !== 'json') {
      return res;
    }

    if (res.data !== undefined) {
      res.data = convertSnakeToCamel(res.data);
    }
    return res;
  });

  return instance;
};
