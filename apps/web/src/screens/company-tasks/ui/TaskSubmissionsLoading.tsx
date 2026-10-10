import { Skeleton } from '@/shared/ui';

import { TaskLoadingState } from '../model';
import { TasksShell } from './TasksShell';

export const TaskSubmissionsListSkeleton = () => {
  return (
    <TaskLoadingState label="Загружаем решения…">
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="flex flex-col justify-between gap-4 rounded-xl border bg-card p-5 sm:p-6 sm:flex-row sm:items-center"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-40 max-w-full" />
              <Skeleton className="h-6 w-64 max-w-full" />
              <Skeleton className="h-5 w-48 max-w-full" />
            </div>
            <Skeleton className="h-10 w-44 max-w-full self-start" />
          </div>
        ))}
      </div>
    </TaskLoadingState>
  );
};

export const TaskSubmissionsLoading = () => {
  return (
    <TasksShell title="Мои решения" history>
      <div
        aria-hidden="true"
        className="grid gap-4 rounded-xl border bg-card p-5 sm:p-6 sm:grid-cols-2 motion-reduce:[&_[data-slot=skeleton]]:animate-none"
      >
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <TaskSubmissionsListSkeleton />
    </TasksShell>
  );
};
