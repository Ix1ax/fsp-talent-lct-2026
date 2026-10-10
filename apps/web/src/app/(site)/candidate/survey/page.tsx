import type { Metadata } from 'next';

import { STATIC_ROUTES } from '@/shared/contants';
import { USER_ROLES } from '@/entities/session';
import { requireRole } from '@/entities/session/api/server';
import { CandidateSurveyPage } from '@/screens/candidate';
export const metadata: Metadata = { title: 'Направление и уровень · ФСП' };
const Page = async () => {
  await requireRole(USER_ROLES.CANDIDATE, STATIC_ROUTES.CANDIDATE_SURVEY);
  return <CandidateSurveyPage />;
};
export default Page;
