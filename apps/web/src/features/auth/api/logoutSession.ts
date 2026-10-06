import { clearClientAccessToken, clearOidcUser } from '@/shared/auth';

export const logoutSession = async (): Promise<void> => {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'same-origin',
  });
  if (!response.ok)
    throw new Error('Не удалось завершить сессию. Попробуйте ещё раз.');

  clearClientAccessToken();
  await clearOidcUser();
};
