import type { ReactNode } from 'react';

import { PageWrapper } from '@/shared/ui';

import { TasksHeader } from './TasksHeader';

interface TasksShellProps {
  children: ReactNode;
  title: string;
  history?: boolean;
  detail?: boolean;
}

export const TasksShell = ({
  children,
  title,
  history = false,
  detail = false,
}: TasksShellProps) => {
  return (
    <PageWrapper>
      <TasksHeader title={title} history={history} detail={detail} />
      {children}
    </PageWrapper>
  );
};
