'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';
import {
  AsyncState,
  Button,
  Label,
  OptionSelect,
  PageControls,
} from '@/shared/ui';
import {
  listMyTaskSubmissions,
  type SubmissionFilters,
} from '@/entities/company-task';

import { useTaskQuery } from '../model';
import { TasksShell } from './TasksShell';
import { TaskSubmissionsListSkeleton } from './TaskSubmissionsLoading';

export const TaskSubmissionsPage = () => {
  const [filters, setFilters] = useState<SubmissionFilters>({
    status: 'all',
    sort: 'newest',
  });

  const [offset, setOffset] = useState(0);
  const load = useCallback(
    (signal: AbortSignal) => listMyTaskSubmissions(filters, offset, signal),
    [filters, offset],
  );

  const query = useTaskQuery(load);

  return (
    <TasksShell title="Мои решения" history>
      <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="submission-status">Статус решения</Label>
          <OptionSelect
            id="submission-status"
            value={filters.status || 'all'}
            options={[
              { value: 'all', label: 'Все решения' },
              { value: 'submitted', label: 'Ожидают проверки' },
              { value: 'reviewed', label: 'Проверены' },
            ]}
            onValueChange={(value) => {
              setOffset(0);
              setFilters((current) => ({
                ...current,
                status: value as SubmissionFilters['status'],
              }));
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="submission-sort">Порядок</Label>
          <OptionSelect
            id="submission-sort"
            value={filters.sort || 'newest'}
            options={[
              { value: 'newest', label: 'Сначала новые' },
              { value: 'score', label: 'Сначала высокая оценка' },
            ]}
            onValueChange={(value) => {
              setOffset(0);
              setFilters((current) => ({
                ...current,
                sort: value as SubmissionFilters['sort'],
              }));
            }}
          />
        </div>
      </div>
      {query.pending && <TaskSubmissionsListSkeleton />}
      {query.error && (
        <AsyncState
          title="Не удалось загрузить решения"
          description={query.error}
          error
          onRetry={query.retry}
        />
      )}
      {query.data && (
        <>
          {!query.data.items.length && (
            <AsyncState
              title="Решений пока нет"
              description="Отправьте решение задания компании. Здесь появятся результаты и комментарии работодателя."
            />
          )}
          <div className="space-y-3">
            {query.data.items.map((submission) => (
              <article
                key={submission.id}
                className="flex flex-col justify-between gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 space-y-2">
                  <p className="break-words text-sm text-muted-foreground">
                    {submission.companyName}
                  </p>
                  <h2 className="break-words font-semibold">
                    <Link
                      href={`${STATIC_ROUTES.CANDIDATE_TASK_SUBMISSIONS}/${submission.id}`}
                      className="hover:underline"
                    >
                      {submission.taskTitle}
                    </Link>
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {submission.status === 'reviewed'
                      ? 'Проверено'
                      : 'Ожидает проверки'}
                    {submission.score !== null &&
                      ` · ${submission.score} из 100`}{' '}
                    ·{' '}
                    {new Date(submission.submittedAt).toLocaleDateString(
                      'ru-RU',
                    )}
                  </p>
                </div>
                <Button asChild variant="outline" className="self-start">
                  <Link
                    href={`${STATIC_ROUTES.CANDIDATE_TASK_SUBMISSIONS}/${submission.id}`}
                  >
                    Посмотреть решение
                  </Link>
                </Button>
              </article>
            ))}
          </div>
          <PageControls
            offset={offset}
            count={query.data.items.length}
            total={query.data.total}
            onPage={setOffset}
          />
        </>
      )}
    </TasksShell>
  );
};
