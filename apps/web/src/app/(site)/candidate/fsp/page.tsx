import type { Metadata } from 'next';

import { STATIC_ROUTES } from '@/shared/contants';
import { USER_ROLES } from '@/entities/session';
import { requireRole } from '@/entities/session/api/server';
import { CandidateFSPPage } from '@/screens/candidate';

export const metadata: Metadata = { title: 'Достижения ФСП · ФСП' };

const Page = async () => {
  await requireRole(USER_ROLES.CANDIDATE, STATIC_ROUTES.CANDIDATE_FSP);

  return <CandidateFSPPage />;
};

export default Page;
