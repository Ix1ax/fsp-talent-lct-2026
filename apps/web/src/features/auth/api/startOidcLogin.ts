import { getAuthConfig } from '@/shared/api/authConfig';
import { createOidcManager } from '@/shared/auth';
import { getHttpPkceArgs } from '@/shared/auth/httpPkce';
import { rememberLoginReturnPath } from '@/shared/auth/loginReturnPath';
import { sanitizeRedirectPath } from '@/shared/utils';

export const startOidcLogin = async (
  nextPath?: string | null,
): Promise<void> => {
  const returnPath =
    nextPath ??
    (typeof window === 'undefined'
      ? null
      : new URLSearchParams(window.location.search).get('next'));
  rememberLoginReturnPath(returnPath);
  const config = await getAuthConfig();
  const manager = createOidcManager(config.issuer, config.clientId);
  const safeNext = returnPath ? sanitizeRedirectPath(returnPath) : undefined;
  const pkceArgs = await getHttpPkceArgs();
  await manager.signinRedirect(
    safeNext ? { ...pkceArgs, state: { next: safeNext } } : pkceArgs,
  );
};
