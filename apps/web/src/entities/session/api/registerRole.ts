import { clientApi } from '@/shared/api';

import type { RegistrationRole } from '../model';

export const registerRole = async (role: RegistrationRole): Promise<void> => {
  await clientApi.post('/v1/me/register', { role });
};
