import type { Metadata } from 'next';

import { getCatalogs } from '@/entities/catalog';
import { USER_ROLES } from '@/entities/session';
import { requireRole } from '@/entities/session/api/server';
import { AssessmentsPage } from '@/screens/assessments';

export const metadata: Metadata = { title: 'Тестирование · ФСП' };

const Page = async () => {
  await requireRole(USER_ROLES.CANDIDATE, '/candidate/assessments');
  const catalogs = await getCatalogs().catch(() => undefined);

  return <AssessmentsPage catalogs={catalogs} />;
};

export default Page;
