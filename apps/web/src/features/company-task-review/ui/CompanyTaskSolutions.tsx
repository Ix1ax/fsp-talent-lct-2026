import { useCallback, useState } from 'react';

import { useRemoteData } from '@/shared/hooks/useRemoteData';
import { cn } from '@/shared/lib/utils';
import {
  AsyncState,
  Badge,
  Button,
  FadeIn,
  Input,
  Label,
  OptionSelect,
  PageControls,
  Stagger,
  StaggerItem,
} from '@/shared/ui';
import { formatDate } from '@/shared/utils';
import type { Catalogs } from '@/entities/catalog';
import type { Company } from '@/entities/company';
import {
  type CompanyTask,
  type CompanyTaskFilters,
  listCompanyTasks,
} from '@/entities/company-task';

import { canReviewTaskSubmission } from '../lib';
import { CompanyTaskCreateForm } from './CompanyTaskCreateForm';
import { CompanyTaskDetails } from './CompanyTaskDetails';
import { CompanyTaskSkeleton } from './CompanyTaskSkeleton';

interface CompanyTaskSolutionsProps {
  company: Company;
  catalogs: Catalogs;
  onOpenCandidate: (candidateId: string) => void;
  onDirtyChange: (dirty: boolean) => void;
  onBusyChange: (busy: boolean) => void;
}

export const CompanyTaskSolutions = ({
  company,
  catalogs,
  onOpenCandidate,
  onDirtyChange,
  onBusyChange,
}: CompanyTaskSolutionsProps) => {
  const [task, setTask] = useState<CompanyTask | null>(null);
  const [creating, setCreating] = useState(false);
  const [filters, setFilters] = useState<CompanyTaskFilters>({ status: 'all' });
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const load = useCallback(
    (signal: AbortSignal) =>
      listCompanyTasks(company.id, filters, offset, signal),
    [company.id, filters, offset],
  );
  const query = useRemoteData(load, 0, !task && !creating, {
    keepPreviousData: true,
  });

  if (creating) {
    return (
      <FadeIn key="create" distance={6}>
        <CompanyTaskCreateForm
          companyId={company.id}
          onCancel={() => setCreating(false)}
          onDirtyChange={onDirtyChange}
          onBusyChange={onBusyChange}
          onCreated={(created) => {
            setCreating(false);
            setOffset(0);
            setSearch('');
            setFilters({ status: 'all' });
            query.retry();
            setTask(created);
          }}
        />
      </FadeIn>
    );
  }

  if (task) {
    return (
      <FadeIn key={task.id} distance={6}>
        <CompanyTaskDetails
          key={task.id}
          company={company}
          taskId={task.id}
          catalogs={catalogs}
          onOpenCandidate={onOpenCandidate}
          onTaskChange={(updated) => {
            setTask(updated);
            query.retry();
          }}
          onBack={() => setTask(null)}
          onDirtyChange={onDirtyChange}
          onBusyChange={onBusyChange}
        />
      </FadeIn>
    );
  }

  return (
    <FadeIn key="tasks" distance={6} className="grid min-w-0 gap-5">
      {canReviewTaskSubmission(company.memberRole) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Одна публикация в день на компанию по московскому времени.
          </p>
          <Button onClick={() => setCreating(true)}>Создать задание</Button>
        </div>
      )}
      <form
        className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_14rem_auto] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          setOffset(0);
          setFilters((current) => ({
            ...current,
            q: search.trim() || undefined,
          }));
        }}
      >
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="company-task-search">Поиск заданий</Label>
          <Input
            id="company-task-search"
            value={search}
            maxLength={200}
            placeholder="Название или описание"
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="company-task-status">Приём решений</Label>
          <OptionSelect
            id="company-task-status"
            value={filters.status ?? 'all'}
            options={[
              { value: 'all', label: 'Все задания' },
              { value: 'open', label: 'Приём открыт' },
              { value: 'closed', label: 'Приём завершён' },
            ]}
            onValueChange={(value) => {
              setOffset(0);
              setFilters((current) => ({
                ...current,
                status: value as CompanyTaskFilters['status'],
              }));
            }}
          />
        </div>
        <Button type="submit">Найти</Button>
      </form>
      {query.loading && !query.data && <CompanyTaskSkeleton tasks />}
      {query.loading && query.data && (
        <span role="status" className="sr-only">
          Обновляем задания…
        </span>
      )}
      {query.error && (
        <AsyncState
          error
          title="Задания недоступны"
          description={query.error}
          onRetry={query.retry}
        />
      )}
      {query.data && (
        <div
          aria-busy={query.loading}
          className={cn(
            'grid gap-5 transition-opacity motion-reduce:transition-none',
            query.loading && 'opacity-60',
          )}
        >
          {!query.loading && !query.error && !query.data.items.length && (
            <AsyncState
              title="Заданий пока нет"
              description="Здесь появятся опубликованные задания этой компании. Попробуйте изменить поиск или статус."
            />
          )}
          <Stagger className="grid gap-4 md:grid-cols-2">
            {query.data.items.map((item) => (
              <StaggerItem key={item.id} className="min-w-0">
                <article className="flex h-full min-w-0 flex-col gap-4 rounded-xl border bg-card p-5 sm:p-6">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {item.status === 'open'
                        ? 'Приём открыт'
                        : 'Приём завершён'}
                    </Badge>
                    {item.moderationStatus === 'hidden' && (
                      <Badge variant="outline">Скрыто модератором</Badge>
                    )}
                  </div>
                  <h2 className="break-words text-lg font-semibold">
                    {item.title}
                  </h2>
                  <p className="line-clamp-3 break-words text-sm text-muted-foreground">
                    {item.description ||
                      'Условие задания — в приложенном файле.'}
                  </p>
                  <p className="mt-auto text-sm text-muted-foreground">
                    Опубликовано: {formatDate(item.publishedAt)}
                  </p>
                  <Button
                    variant="outline"
                    disabled={query.loading}
                    onClick={() => setTask(item)}
                    className="self-start"
                  >
                    Открыть задание
                  </Button>
                </article>
              </StaggerItem>
            ))}
          </Stagger>
          <PageControls
            offset={query.data.offset}
            count={query.data.items.length}
            total={query.data.total}
            pending={query.loading}
            onPage={setOffset}
          />
        </div>
      )}
    </FadeIn>
  );
};
