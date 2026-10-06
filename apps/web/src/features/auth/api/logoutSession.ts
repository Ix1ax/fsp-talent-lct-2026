import { clearClientAccessToken } from '@/shared/auth';

export const logoutSession = async (): Promise<void> => {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'same-origin',
  });

  clearClientAccessToken();
};
