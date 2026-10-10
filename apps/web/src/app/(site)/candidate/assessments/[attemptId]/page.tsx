import { notFound } from 'next/navigation';

import { DYNAMIC_ROUTES } from '@/shared/contants';
import { USER_ROLES } from '@/entities/session';
import { requireRole } from '@/entities/session/api/server';
import { AssessmentAttemptPage } from '@/screens/assessments';

const Page = async ({ params }: { params: Promise<{ attemptId: string }> }) => {
  const { attemptId } = await params;

  await requireRole(
    USER_ROLES.CANDIDATE,
    DYNAMIC_ROUTES.CANDIDATE_ASSESSMENT(attemptId),
  );

  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(attemptId))
    notFound();

  return <AssessmentAttemptPage key={attemptId} attemptId={attemptId} />;
};
export default Page;
