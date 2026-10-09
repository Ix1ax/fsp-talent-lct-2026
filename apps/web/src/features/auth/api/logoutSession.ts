import { getAuthConfig } from '@/shared/api/authConfig';
import {
  clearClientAccessToken,
  clearOidcUser,
  createOidcManager,
} from '@/shared/auth';
import { approveUnsavedUnload } from '@/shared/hooks/navigation';

export const logoutSession = async (): Promise<void> => {
  const config = await getAuthConfig();
  const manager = createOidcManager(config.issuer, config.clientId);
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'same-origin',
  });

  if (!response.ok)
    throw new Error('Не удалось завершить сессию. Попробуйте ещё раз.');

  clearClientAccessToken();
  await clearOidcUser();
  const cancelApproval = approveUnsavedUnload();
  try {
    await manager.signoutRedirect();
  } catch (error) {
    cancelApproval();
    throw error;
  }
};
