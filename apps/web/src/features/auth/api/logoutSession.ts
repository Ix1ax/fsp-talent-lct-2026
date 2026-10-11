import { getAuthConfig } from '@/shared/api/authConfig';
import {
  clearClientAccessToken,
  clearOidcUser,
  createOidcManager,
} from '@/shared/auth';
import { approveUnsavedUnload } from '@/shared/hooks/navigation';
import { rememberRole } from '@/entities/session';

export const logoutSession = async (): Promise<void> => {
  const config = await getAuthConfig();
  const manager = createOidcManager(config.issuer, config.clientId);
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'same-origin',
  });

  if (!response.ok)
    throw new Error('Не удалось завершить сессию. Попробуйте ещё раз.');

  const { idTokenHint } = (await response.json().catch(() => ({}))) as {
    idTokenHint?: string | null;
  };
  clearClientAccessToken();
  rememberRole(undefined);
  const user = await manager.getUser();
  await clearOidcUser();
  const cancelApproval = approveUnsavedUnload();
  try {
    await manager.signoutRedirect({
      id_token_hint: idTokenHint ?? user?.id_token,
    });
  } catch (error) {
    cancelApproval();
    throw error;
  }
};
