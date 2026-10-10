import type { Metadata } from 'next';

import { STATIC_ROUTES } from '@/shared/contants';
import { getAllSkills, getCatalogs } from '@/entities/catalog/api/server';
import { USER_ROLES } from '@/entities/session';
import { requireRole } from '@/entities/session/api/server';
import { AssessmentsPage } from '@/screens/assessments';

export const metadata: Metadata = { title: 'Тестирование · ФСП' };

const Page = async () => {
  await requireRole(USER_ROLES.CANDIDATE, STATIC_ROUTES.CANDIDATE_ASSESSMENTS);
  const [catalogs, skills] = await Promise.all([
    getCatalogs().catch(() => undefined),
    getAllSkills({}).catch(() => []),
  ]);

  return <AssessmentsPage catalogs={catalogs} skills={skills} />;
};

export default Page;
