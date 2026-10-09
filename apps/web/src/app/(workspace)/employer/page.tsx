import { USER_ROLES } from '@/entities/session';
import { requireRole } from '@/entities/session/api/server';
import {
  type EmployerSearchParams,
  getEmployerReturnPath,
} from '@/screens/employer';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<EmployerSearchParams>;
}) {
  await requireRole(
    USER_ROLES.EMPLOYER,
    getEmployerReturnPath('overview', await searchParams),
  );

  return null;
}
