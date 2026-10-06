import { STATIC_ROUTES } from '@/shared/contants';
import { USER_ROLES } from '@/entities/session';
import { requireRole } from '@/entities/session/api/server';
import { CandidateHomePage } from '@/pages/candidate';

export default async function Page() {
  const user = await requireRole(USER_ROLES.CANDIDATE, STATIC_ROUTES.CANDIDATE);

  return <CandidateHomePage user={user} />;
}
