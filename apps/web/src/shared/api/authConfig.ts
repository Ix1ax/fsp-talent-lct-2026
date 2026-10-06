import { clientApi } from './client';

export type AuthConfig = {
  issuer: string;
  clientId: string;
};

let cached: AuthConfig | null = null;

export const getAuthConfig = async (): Promise<AuthConfig> => {
  if (cached) return cached;

  const { data } = await clientApi.get<AuthConfig>('/v1/auth/config', {
    skipAuthRefresh: true,
  });

  cached = data;
  return data;
};
