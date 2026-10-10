'use client';

import { useCallback, useState } from 'react';

import { AsyncState, PageControls } from '@/shared/ui';
import { listTasks, type TaskFilters } from '@/entities/company-task';

import { useTaskQuery } from '../model';
import { TaskCard } from './TaskCard';
import { TaskFiltersForm } from './TaskFiltersForm';
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
      <TaskFiltersForm
        filters={filters}
        query={q}
        onQueryChange={setQ}
        onSearch={() => {
          setOffset(0);
          setFilters((current) => ({ ...current, q: q.trim() || undefined }));
        }}
        onStatusChange={(status) => {
          setOffset(0);
          setFilters((current) => ({ ...current, status }));
        }}
      />
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
          {!query.pending && !query.error && !query.data.items.length && (
            <AsyncState
              title="Заданий пока нет"
              description="Попробуйте изменить поиск или вернитесь позже: здесь появятся задания работодателей."
            />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {query.data.items.map((task) => (
              <TaskCard key={task.id} task={task} />
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
