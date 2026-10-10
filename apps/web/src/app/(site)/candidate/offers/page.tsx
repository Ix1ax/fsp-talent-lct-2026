import type { Metadata } from 'next';

import { STATIC_ROUTES } from '@/shared/contants';
import { USER_ROLES } from '@/entities/session';
import { requireRole } from '@/entities/session/api/server';
import { IncomingOffers } from '@/features/candidate';

export const metadata: Metadata = { title: 'Входящие предложения · ФСП' };

const CandidateOffersPage = async () => {
  await requireRole(USER_ROLES.CANDIDATE, STATIC_ROUTES.OFFERS);

  return <IncomingOffers />;
};

export default CandidateOffersPage;
