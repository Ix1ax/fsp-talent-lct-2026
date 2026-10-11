import { STATIC_ROUTES } from '@/shared/contants';

import { USER_ROLES, type UserRole } from './types';

export const getRoleHomeRoute = (role: UserRole): string => {
  if (role === USER_ROLES.CANDIDATE) return STATIC_ROUTES.CANDIDATE;
  if (role === USER_ROLES.EMPLOYER) return STATIC_ROUTES.EMPLOYER;

  return STATIC_ROUTES.HOME;
};
