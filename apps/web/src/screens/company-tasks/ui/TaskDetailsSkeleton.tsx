import { Skeleton } from '@/shared/ui';

import { TaskLoadingState } from '../model';

export const TaskDetailsSkeleton = () => {
  return (
    <TaskLoadingState label="Загружаем задание…">
      <div className="grid gap-8">
        <div className="grid gap-4 rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-5 w-64 max-w-full" />
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-6 rounded-xl border bg-card p-5 sm:p-6">
            <Skeleton className="h-7 w-48 max-w-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-2/3" />
            </div>
            <div className="space-y-3 border-t pt-6">
              <Skeleton className="h-10 w-48 max-w-full" />
              <Skeleton className="h-10 w-36" />
              <Skeleton className="h-5 w-40 max-w-full" />
            </div>
          </div>
          <div className="space-y-6 rounded-xl border bg-card p-5 sm:p-6">
            <div className="space-y-2">
              <Skeleton className="h-7 w-48 max-w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </TaskLoadingState>
  );
};
