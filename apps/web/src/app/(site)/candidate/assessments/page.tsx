import type { Metadata } from 'next';

import { STATIC_ROUTES } from '@/shared/contants';
import { getClientCatalogs } from '@/entities/catalog';
import { USER_ROLES } from '@/entities/session';
import { requireRole } from '@/entities/session/api/server';
import { AssessmentsPage } from '@/screens/assessments';

export const metadata: Metadata = { title: 'Тестирование · ФСП' };

const Page = async () => {
  await requireRole(USER_ROLES.CANDIDATE, STATIC_ROUTES.CANDIDATE_ASSESSMENTS);
  const catalogs = await getClientCatalogs().catch(() => undefined);

  return <AssessmentsPage catalogs={catalogs} />;
};

export default Page;
