import { getAuthConfig } from '@/shared/api/authConfig';
import { createOidcManager } from '@/shared/auth';
import { sanitizeRedirectPath } from '@/shared/utils';

export const startOidcLogin = async (
  nextPath?: string | null,
): Promise<void> => {
  const config = await getAuthConfig();
  const manager = createOidcManager(config.issuer, config.clientId);
  const safeNext = nextPath ? sanitizeRedirectPath(nextPath) : undefined;
  await manager.signinRedirect(
    safeNext ? { state: { next: safeNext } } : undefined,
  );
};
