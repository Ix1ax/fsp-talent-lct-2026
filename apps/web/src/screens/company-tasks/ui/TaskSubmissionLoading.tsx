import { Skeleton } from '@/shared/ui';

import { TaskLoadingState } from '../model';
import { TasksShell } from './TasksShell';

export const TaskSubmissionSkeleton = () => {
  return (
    <TaskLoadingState label="Загружаем решение…">
      <div className="max-w-3xl space-y-5">
        <div>
          <Skeleton className="h-5 w-40 max-w-full" />
          <Skeleton className="mt-2 h-7 w-3/4" />
        </div>
        <div className="space-y-5 rounded-xl border bg-card p-5 sm:p-6">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48 max-w-full" />
            <Skeleton className="h-5 w-3/4" />
          </div>
          <Skeleton className="h-8 w-28" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-56 max-w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <Skeleton className="h-5 w-56 max-w-full" />
          <Skeleton className="h-5 w-56 max-w-full" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-5 w-40 max-w-full" />
          </div>
        </div>
        <Skeleton className="h-10 w-40 max-w-full" />
      </div>
    </TaskLoadingState>
  );
};

export const TaskSubmissionLoading = () => {
  return (
    <TasksShell title="Моё решение" history>
      <TaskSubmissionSkeleton />
    </TasksShell>
  );
};
