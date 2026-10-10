import type { Metadata } from 'next';

import { STATIC_ROUTES } from '@/shared/contants';
import { getAllSkills, getCatalogs } from '@/entities/catalog/api/server';
import { USER_ROLES } from '@/entities/session';
import { requireRole } from '@/entities/session/api/server';
import { AssessmentsPage } from '@/screens/assessments';

export const metadata: Metadata = { title: 'Тестирование · ФСП' };

const Page = async () => {
  await requireRole(USER_ROLES.CANDIDATE, STATIC_ROUTES.CANDIDATE_ASSESSMENTS);
  const [catalogsResult, skillsResult] = await Promise.allSettled([
    getCatalogs(),
    getAllSkills({}),
  ]);

  const catalogs =
    catalogsResult.status === 'fulfilled' ? catalogsResult.value : undefined;
  const skills = skillsResult.status === 'fulfilled' ? skillsResult.value : [];
  const catalogsError =
    catalogsResult.status === 'rejected' || skillsResult.status === 'rejected'
      ? 'Не удалось загрузить названия языков, специализаций и уровней. Часть названий временно заменена идентификаторами.'
      : undefined;

  return (
    <AssessmentsPage
      catalogs={catalogs}
      skills={skills}
      catalogsError={catalogsError}
    />
  );
};

export default Page;
