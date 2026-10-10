import { Skeleton } from '@/shared/ui';

import { TaskLoadingState } from '../model';
import { TasksShell } from './TasksShell';

export const TasksListSkeleton = () => (
  <TaskLoadingState label="Загружаем задания…">
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5 sm:p-6"
        >
          <Skeleton className="h-5 w-28" />
          <div>
            <Skeleton className="h-5 w-40 max-w-full" />
            <Skeleton className="mt-2 h-7 w-3/4" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Skeleton className="mt-auto h-5 w-40 max-w-full" />
          <Skeleton className="h-10 w-40 max-w-full" />
        </div>
      ))}
    </div>
  </TaskLoadingState>
);

export const TasksLoading = () => (
  <TasksShell title="Задания компаний">
    <div
      aria-hidden="true"
      className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-end motion-reduce:[&_[data-slot=skeleton]]:animate-none"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="flex min-w-0 flex-col gap-2 sm:w-56">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-10 w-20" />
    </div>
    <TasksListSkeleton />
  </TasksShell>
);
