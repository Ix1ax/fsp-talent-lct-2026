import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Skip 401 → refresh → retry (e.g. login/register). */
    skipAuthRefresh?: boolean;
    /** Internal: request already went through a refresh retry. */
    _retry?: boolean;
  }
}

export {};
