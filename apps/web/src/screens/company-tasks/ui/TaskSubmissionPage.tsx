'use client';

import { useCallback } from 'react';
import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';
import { AsyncState, Button } from '@/shared/ui';
import { getMyTaskSubmission } from '@/entities/company-task';

import { useTaskQuery } from '../model';
import { SubmissionResult } from './SubmissionResult';
import { TasksShell } from './TasksShell';
import { TaskSubmissionSkeleton } from './TaskSubmissionLoading';

interface TaskSubmissionPageProps {
  id: string;
}

export const TaskSubmissionPage = ({ id }: TaskSubmissionPageProps) => {
  const load = useCallback(
    (signal: AbortSignal) => getMyTaskSubmission(id, signal),
    [id],
  );

  const query = useTaskQuery(load);

  return (
    <TasksShell title="Моё решение" history>
      {query.pending && <TaskSubmissionSkeleton />}
      {query.error && (
        <AsyncState
          title="Решение недоступно"
          description={query.error}
          error
          onRetry={query.retry}
        />
      )}
      {query.data && (
        <div className="max-w-3xl space-y-6">
          <header>
            <p className="text-sm text-muted-foreground">
              {query.data.companyName}
            </p>
            <h2 className="mt-2 break-words text-xl font-semibold">
              {query.data.taskTitle}
            </h2>
          </header>
          <SubmissionResult submission={query.data} />
          <Button asChild variant="outline">
            <Link
              href={`${STATIC_ROUTES.CANDIDATE_TASKS}/${query.data.taskId}`}
            >
              Открыть задание
            </Link>
          </Button>
        </div>
      )}
    </TasksShell>
  );
};
