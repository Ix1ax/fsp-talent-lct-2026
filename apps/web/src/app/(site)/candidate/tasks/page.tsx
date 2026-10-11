import type { Metadata } from 'next';

import { USER_ROLES } from '@/entities/session';
import { requireRole } from '@/entities/session/api/server';
import { TasksPage } from '@/screens/company-tasks';

export const metadata: Metadata = { title: 'Задания компаний · ФСП' };

const Page = async () => {
  await requireRole(USER_ROLES.CANDIDATE, '/candidate/tasks');

  return <TasksPage />;
};

export default Page;
