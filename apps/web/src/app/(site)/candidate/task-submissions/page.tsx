import type { Metadata } from 'next';

import { USER_ROLES } from '@/entities/session';
import { requireRole } from '@/entities/session/api/server';
import { TaskSubmissionsPage } from '@/screens/company-tasks';

export const metadata: Metadata = { title: 'Мои решения · ФСП' };

const Page = async () => {
  await requireRole(USER_ROLES.CANDIDATE, '/candidate/task-submissions');

  return <TaskSubmissionsPage />;
};

export default Page;
