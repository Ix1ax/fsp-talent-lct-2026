import type { Metadata } from 'next';

import { ApiError } from '@/shared/api/errors';
import { STATIC_ROUTES } from '@/shared/contants';
import { getCandidateProfile } from '@/entities/candidate-profile/api/server';
import { getCatalogs } from '@/entities/catalog/api';
import { USER_ROLES } from '@/entities/session';
import { requireRole } from '@/entities/session/api/server';
import { CandidateHomePage } from '@/screens/candidate';

export const metadata: Metadata = { title: 'Профиль кандидата · ФСП' };

export default async function Page() {
  const user = await requireRole(USER_ROLES.CANDIDATE, STATIC_ROUTES.CANDIDATE);

  const [profileResult, catalogsResult] = await Promise.allSettled([
    getCandidateProfile(),
    getCatalogs(),
  ]);

  let loadError: string | undefined;

  if (profileResult.status === 'rejected') {
    const error: unknown = profileResult.reason;
    if (!(
      error instanceof ApiError &&
      error.code === 'profile_not_found' &&
      error.status === 404
    )) {
      loadError = 'Не удалось загрузить профиль. Попробуйте ещё раз.';
    }
  }

  const initialProfile =
    profileResult.status === 'fulfilled' ? profileResult.value : undefined;

  return (
    <CandidateHomePage
      key={`${initialProfile?.id ?? 'new'}-${loadError ?? 'ready'}`}
      user={user}
      initialProfile={initialProfile}
      workFormats={
        catalogsResult.status === 'fulfilled'
          ? catalogsResult.value.workFormats
          : undefined
      }
      loadError={loadError}
    />
  );
}
