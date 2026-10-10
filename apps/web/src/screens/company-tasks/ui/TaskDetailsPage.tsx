'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2Icon,
  CalendarClockIcon,
  CheckCircle2Icon,
  FileTextIcon,
} from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import { AsyncState, Badge, Button, FadeIn } from '@/shared/ui';
import {
  downloadTask,
  getTask,
  type TaskSubmission,
} from '@/entities/company-task';
import { isTaskOpen, TaskSolutionForm } from '@/features/task-solution';

import { useTaskQuery } from '../model';
import { SubmissionResult } from './SubmissionResult';
import { TaskDetailsSkeleton } from './TaskDetailsSkeleton';
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
          <header className="grid gap-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Building2Icon aria-hidden="true" className="size-4" />
                {task.companyName}
              </span>
              <Badge variant={isTaskOpen(task, now) ? 'success' : 'secondary'}>
                {isTaskOpen(task, now) ? 'Приём открыт' : 'Приём завершён'}
              </Badge>
            </div>
            <h1 className="max-w-4xl break-words text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              {task.title}
            </h1>
            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <CalendarClockIcon
                  aria-hidden="true"
                  className="size-4 shrink-0"
                />
                {task.deadlineAt
                  ? `Приём до ${new Date(task.deadlineAt).toLocaleString('ru-RU')}`
                  : 'Без срока окончания'}
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2Icon
                  aria-hidden="true"
                  className="size-4 shrink-0"
                />
                Одна окончательная отправка
              </span>
            </div>
          </header>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <section
              aria-labelledby="task-condition-title"
              className="grid min-w-0 gap-6 rounded-xl border bg-card p-5 sm:p-8"
            >
              <div className="grid gap-4">
                <h2 id="task-condition-title" className="text-xl font-semibold">
                  Условие задания
                </h2>
                <p className="whitespace-pre-wrap break-words text-base leading-relaxed text-muted-foreground">
                  {task.description ||
                    'Скачайте файл с полным условием задания.'}
                </p>
              </div>
              <div className="grid gap-4 border-t pt-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <FileTextIcon
                      aria-hidden="true"
                      className="size-5 text-muted-foreground"
                    />
                  </span>
                  <div>
                    <h3 className="font-medium">Файл условия</h3>
                    <p className="text-sm text-muted-foreground">
                      {(task.file.sizeBytes / 1024).toLocaleString('ru-RU', {
                        maximumFractionDigits: 1,
                      })}{' '}
                      КиБ
                    </p>
                  </div>
                </div>
                <TaskFileDownload
                  name={task.file.originalName}
                  load={() => downloadTask(id)}
                />
              </div>
            </section>
            <div className="min-w-0">
              {submission && (
                <FadeIn distance={4}>
                  <SubmissionResult submission={submission} />
                </FadeIn>
              )}
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
        </FadeIn>
      )}
    </TasksShell>
  );
};
