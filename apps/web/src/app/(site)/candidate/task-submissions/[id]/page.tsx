import { notFound } from 'next/navigation';

import { REGEXPS } from '@/shared/contants';
import { USER_ROLES } from '@/entities/session';
import { requireRole } from '@/entities/session/api/server';
import { TaskSubmissionPage } from '@/screens/company-tasks';

interface PageProps {
  params: Promise<{ id: string }>;
}

const Page = async ({ params }: PageProps) => {
  const { id } = await params;

  if (!REGEXPS.UUID.test(id)) notFound();
  await requireRole(USER_ROLES.CANDIDATE, `/candidate/task-submissions/${id}`);

  return <TaskSubmissionPage key={id} id={id} />;
};

export default Page;
