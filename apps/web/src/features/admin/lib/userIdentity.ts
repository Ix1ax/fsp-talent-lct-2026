import type { AdminUser } from '@/entities/admin';

import { userRoleLabels } from '../constants';

type UserIdentity = Pick<
  AdminUser,
  'full_name' | 'email' | 'contact_email' | 'role'
>;

export const adminUserLabel = (user: UserIdentity) =>
  user.full_name?.trim() ||
  user.email?.trim() ||
  user.contact_email?.trim() ||
  userRoleLabels[user.role];
