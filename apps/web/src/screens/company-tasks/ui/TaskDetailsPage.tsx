'use client';

import { useCallback, useEffect, useState } from 'react';

import { AsyncState, FadeIn } from '@/shared/ui';
import { getTask, type TaskSubmission } from '@/entities/company-task';

import { useTaskQuery } from '../model';
import { TaskCondition } from './TaskCondition';
import { TaskDetailsHeader } from './TaskDetailsHeader';
import { TaskDetailsSkeleton } from './TaskDetailsSkeleton';
import { TaskSolutionSection } from './TaskSolutionSection';
import { TasksShell } from './TasksShell';

interface TaskDetailsPageProps {
  id: string;
}

export const TaskDetailsPage = ({ id }: TaskDetailsPageProps) => {
  const load = useCallback((signal: AbortSignal) => getTask(id, signal), [id]);
  const query = useTaskQuery(load);
  const [submission, setSubmission] = useState<TaskSubmission>();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const task = query.data;

  return (
    <TasksShell title="Задание компании" detail>
      {query.pending && <TaskDetailsSkeleton />}
      {query.error && (
        <AsyncState
          title="Задание недоступно"
          description={query.error}
          error
          onRetry={query.retry}
        />
      )}
      {task && (
        <FadeIn distance={6} className="grid gap-8">
          <TaskDetailsHeader task={task} now={now} />
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <TaskCondition task={task} />
            <TaskSolutionSection
              task={task}
              submission={submission}
              now={now}
              onSubmitted={setSubmission}
            />
          </div>
        </FadeIn>
      )}
    </TasksShell>
  );
};
