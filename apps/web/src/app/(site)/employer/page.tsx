import { STATIC_ROUTES } from '@/shared/contants';
import { USER_ROLES } from '@/entities/session';
import { requireRole } from '@/entities/session/api/server';
import { EmployerHomePage } from '@/pages/employer';

export default async function Page() {
  const user = await requireRole(USER_ROLES.EMPLOYER, STATIC_ROUTES.EMPLOYER);

  return <EmployerHomePage user={user} />;
}
