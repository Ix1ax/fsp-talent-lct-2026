import { STATIC_ROUTES } from '@/shared/contants';
import { USER_ROLES } from '@/entities/session';
import { requireRole } from '@/entities/session/api/server';

export default async function Page() {
  await requireRole(USER_ROLES.EMPLOYER, STATIC_ROUTES.EMPLOYER);
  return null;
}
