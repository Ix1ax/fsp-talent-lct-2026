'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';
import { AsyncState, Badge, Button } from '@/shared/ui';
import {
  downloadTask,
  getTask,
  type TaskSubmission,
} from '@/entities/company-task';
import { isTaskOpen, TaskSolutionForm } from '@/features/task-solution';

import { useTaskQuery } from '../model';
import { SubmissionResult } from './SubmissionResult';
import { TaskDetailsSkeleton } from './TaskDetailsLoading';
import { TaskFileDownload } from './TaskFileDownload';
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
    <TasksShell title="Задание компании">
      <Link
        href={STATIC_ROUTES.CANDIDATE_TASKS}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Все задания
      </Link>
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
        <div className="grid items-start gap-6 lg:grid-cols-[1.2fr_1fr]">
          <section className="space-y-5 rounded-xl border bg-card p-5 sm:p-6">
            <Badge variant="secondary">
              {isTaskOpen(task, now) ? 'Приём открыт' : 'Приём завершён'}
            </Badge>
            <div>
              <p className="break-words text-sm text-muted-foreground">
                {task.companyName}
              </p>
              <h2 className="mt-2 break-words text-2xl font-semibold">
                {task.title}
              </h2>
            </div>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {task.description || 'Скачайте файл с условием задания.'}
            </p>
            <p className="text-sm text-muted-foreground">
              {task.deadlineAt
                ? `Срок отправки: ${new Date(task.deadlineAt).toLocaleString('ru-RU')}`
                : 'Срок окончания не указан'}
            </p>
            <TaskFileDownload
              name={task.file.originalName}
              load={() => downloadTask(id)}
            />
          </section>
          <div>
            {submission && <SubmissionResult submission={submission} />}
            {!submission && task.mySubmission && (
              <div className="space-y-4 rounded-xl border bg-card p-6">
                <h2 className="font-semibold">Вы уже отправили решение</h2>
                <p className="text-sm text-muted-foreground">
                  Повторная отправка и замена файла недоступны.
                </p>
                <Button asChild>
                  <Link
                    href={`${STATIC_ROUTES.CANDIDATE_TASK_SUBMISSIONS}/${task.mySubmission.id}`}
                  >
                    Посмотреть решение
                  </Link>
                </Button>
              </div>
            )}
            {!submission && !task.mySubmission && isTaskOpen(task, now) && (
              <TaskSolutionForm task={task} onSubmitted={setSubmission} />
            )}
            {!submission && !task.mySubmission && !isTaskOpen(task, now) && (
              <AsyncState
                title="Приём решений завершён"
                description="Условие можно скачать, но отправить решение уже нельзя."
              />
            )}
          </div>
        </div>
      )}
    </TasksShell>
  );
};
