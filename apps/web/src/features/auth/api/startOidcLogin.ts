import { getAuthConfig } from '@/shared/api/authConfig';
import { createOidcManager } from '@/shared/auth';
import { rememberLoginReturnPath } from '@/shared/auth/loginReturnPath';

export const startOidcLogin = async (): Promise<void> => {
  rememberLoginReturnPath(
    new URLSearchParams(window.location.search).get('next'),
  );
  const config = await getAuthConfig();
  const manager = createOidcManager(config.issuer, config.clientId);
  await manager.signinRedirect();
};
