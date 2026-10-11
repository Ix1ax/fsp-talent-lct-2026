import { USER_ROLES } from '@/entities/session';
import { requireRole } from '@/entities/session/api/server';
import {
  type EmployerSearchParams,
  getEmployerReturnPath,
} from '@/screens/employer';

interface PageProps {
  searchParams: Promise<EmployerSearchParams>;
}

const Page = async ({ searchParams }: PageProps) => {
  await requireRole(
    USER_ROLES.EMPLOYER,
    getEmployerReturnPath('overview', await searchParams),
  );

  return null;
};

export default Page;
