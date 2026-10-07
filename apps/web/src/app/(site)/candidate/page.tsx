import type { Metadata } from 'next';

import { STATIC_ROUTES } from '@/shared/contants';
import { getCandidateFullProfile } from '@/entities/candidate-profile/api/server';
import { getCatalogs } from '@/entities/catalog/api';
import { USER_ROLES } from '@/entities/session';
import { requireRole } from '@/entities/session/api/server';
import { CandidateHomePage } from '@/screens/candidate';

export const metadata: Metadata = { title: 'Профиль кандидата · ФСП' };

export default async function Page() {
  const user = await requireRole(USER_ROLES.CANDIDATE, STATIC_ROUTES.CANDIDATE);

  const [fullProfileResult, catalogsResult] = await Promise.allSettled([
    getCandidateFullProfile(),
    getCatalogs(),
  ]);

  const loadError =
    fullProfileResult.status === 'rejected'
      ? 'Не удалось загрузить профиль. Попробуйте ещё раз.'
      : undefined;

  const initialFullProfile =
    fullProfileResult.status === 'fulfilled'
      ? fullProfileResult.value
      : undefined;

  return (
    <CandidateHomePage
      key={`${initialFullProfile?.profile?.id ?? 'new'}-${loadError ?? 'ready'}`}
      user={user}
      initialFullProfile={initialFullProfile}
      workFormats={
        catalogsResult.status === 'fulfilled'
          ? catalogsResult.value.workFormats
          : undefined
      }
      loadError={loadError}
    />
  );
}
