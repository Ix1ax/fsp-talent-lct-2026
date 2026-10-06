import { getAuthConfig } from '@/shared/api/authConfig';
import { createOidcManager } from '@/shared/auth';

export const startOidcLogin = async (): Promise<void> => {
  const config = await getAuthConfig();
  const manager = createOidcManager(config.issuer, config.clientId);
  await manager.signinRedirect();
};
