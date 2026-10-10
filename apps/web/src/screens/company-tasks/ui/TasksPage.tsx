'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';
import {
  AsyncState,
  Badge,
  Button,
  Input,
  Label,
  OptionSelect,
  PageControls,
} from '@/shared/ui';
import { listTasks, type TaskFilters } from '@/entities/company-task';

import { useTaskQuery } from '../model';
import { TasksListSkeleton } from './TasksLoading';
import { TasksShell } from './TasksShell';

export const TasksPage = () => {
  const [filters, setFilters] = useState<TaskFilters>({ status: 'all' });
  const [q, setQ] = useState('');
  const [offset, setOffset] = useState(0);

  const load = useCallback(
    (signal: AbortSignal) => listTasks(filters, offset, signal),
    [filters, offset],
  );

  const query = useTaskQuery(load, { keepPreviousData: true });

  return (
    <TasksShell title="Задания компаний">
      <form
        className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          setOffset(0);
          setFilters((current) => ({ ...current, q: q.trim() || undefined }));
        }}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Label htmlFor="task-search">Поиск заданий</Label>
          <Input
            id="task-search"
            value={q}
            maxLength={200}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Название или описание"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:w-56">
          <Label htmlFor="task-status">Приём решений</Label>
          <OptionSelect
            id="task-status"
            value={filters.status || 'all'}
            options={[
              { value: 'all', label: 'Все задания' },
              { value: 'open', label: 'Приём открыт' },
              { value: 'closed', label: 'Приём завершён' },
            ]}
            onValueChange={(value) => {
              setOffset(0);
              setFilters((current) => ({
                ...current,
                status: value as TaskFilters['status'],
              }));
            }}
          />
        </div>
        <Button type="submit">Найти</Button>
      </form>
      {query.pending && !query.data && <TasksListSkeleton />}
      {query.pending && query.data && (
        <span role="status" className="sr-only">
          Обновляем задания…
        </span>
      )}
      {query.error && (
        <AsyncState
          title="Не удалось загрузить задания"
          description={query.error}
          error
          onRetry={query.retry}
        />
      )}
      {query.data && (
        <div
          aria-busy={query.pending}
          className={`flex flex-col gap-6 transition-opacity motion-reduce:transition-none ${query.pending ? 'opacity-60' : 'opacity-100'}`}
        >
          {!query.data.items.length && (
            <AsyncState
              title="Заданий пока нет"
              description="Попробуйте изменить поиск или вернитесь позже: здесь появятся задания работодателей."
            />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {query.data.items.map((task) => (
              <article
                key={task.id}
                className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5 sm:p-6"
              >
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {task.status === 'open' ? 'Приём открыт' : 'Приём завершён'}
                  </Badge>
                  {task.mySubmission && (
                    <Badge variant="outline">
                      {task.mySubmission.status === 'reviewed'
                        ? 'Решение проверено'
                        : 'Решение отправлено'}
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="break-words text-sm text-muted-foreground">
                    {task.companyName}
                  </p>
                  <h2 className="mt-2 break-words text-lg font-semibold">
                    <Link
                      href={`${STATIC_ROUTES.CANDIDATE_TASKS}/${task.id}`}
                      className="hover:underline"
                    >
                      {task.title}
                    </Link>
                  </h2>
                </div>
                <p className="line-clamp-3 break-words text-sm text-muted-foreground">
                  {task.description || 'Условие задания — в приложенном файле.'}
                </p>
                <p className="mt-auto text-sm text-muted-foreground">
                  {task.deadlineAt
                    ? `До ${new Date(task.deadlineAt).toLocaleString('ru-RU')}`
                    : 'Без срока окончания'}
                </p>
                <Button asChild variant="outline" className="self-start">
                  <Link href={`${STATIC_ROUTES.CANDIDATE_TASKS}/${task.id}`}>
                    Открыть задание
                  </Link>
                </Button>
              </article>
            ))}
          </div>
          <PageControls
            offset={query.data.offset}
            count={query.data.items.length}
            total={query.data.total}
            pending={query.pending}
            onPage={setOffset}
          />
        </div>
      )}
    </TasksShell>
  );
};
