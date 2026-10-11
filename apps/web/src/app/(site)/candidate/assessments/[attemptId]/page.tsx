import { notFound } from 'next/navigation';

import { DYNAMIC_ROUTES, REGEXPS } from '@/shared/contants';
import { USER_ROLES } from '@/entities/session';
import { requireRole } from '@/entities/session/api/server';
import { AssessmentAttemptPage } from '@/screens/assessments';

interface PageProps {
  params: Promise<{ attemptId: string }>;
}

const Page = async ({ params }: PageProps) => {
  const { attemptId } = await params;

  await requireRole(
    USER_ROLES.CANDIDATE,
    DYNAMIC_ROUTES.CANDIDATE_ASSESSMENT(attemptId),
  );

  if (!REGEXPS.UUID.test(attemptId)) notFound();

  return <AssessmentAttemptPage key={attemptId} attemptId={attemptId} />;
};
export default Page;
