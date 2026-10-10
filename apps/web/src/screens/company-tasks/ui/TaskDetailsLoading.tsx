import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';
import { Skeleton } from '@/shared/ui';

import { TaskLoadingState } from '../model';
import { TasksShell } from './TasksShell';

export const TaskDetailsSkeleton = () => (
  <TaskLoadingState label="Загружаем задание…">
    <div className="grid items-start gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-5 rounded-xl border bg-card p-5 sm:p-6">
        <Skeleton className="h-5 w-28" />
        <div>
          <Skeleton className="h-5 w-40 max-w-full" />
          <Skeleton className="mt-2 h-8 w-3/4" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3" />
        </div>
        <Skeleton className="h-5 w-48 max-w-full" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-5 w-40 max-w-full" />
        </div>
      </div>
      <div className="space-y-5 rounded-xl border bg-card p-5 sm:p-6">
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
        <Skeleton className="h-10 w-44 max-w-full" />
      </div>
    </div>
  </TaskLoadingState>
);

export const TaskDetailsLoading = () => (
  <TasksShell title="Задание компании">
    <Link
      href={STATIC_ROUTES.CANDIDATE_TASKS}
      className="text-sm text-muted-foreground hover:text-foreground"
    >
      ← Все задания
    </Link>
    <TaskDetailsSkeleton />
  </TasksShell>
);
