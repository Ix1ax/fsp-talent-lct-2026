import { clientApi } from '@/shared/api';

import { UserRole } from '../model';

export const registerRole = async (role: UserRole): Promise<void> => {
  await clientApi.post('/v1/me/register', { role });
};
