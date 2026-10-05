import 'server-only';

import { getAccessToken } from '@/shared/auth/session.server';
import { getApiProxyTarget } from '@/shared/config';

import { attachErrorInterceptor, createApi } from './base';

const baseURL = `${getApiProxyTarget()}/api`;

export const serverApi = createApi({ baseURL });
export const publicServerApi = createApi({ baseURL });

serverApi.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

attachErrorInterceptor(serverApi);
attachErrorInterceptor(publicServerApi);
