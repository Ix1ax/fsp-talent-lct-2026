import { useCallback, useState } from 'react';
import { ArrowLeftIcon } from 'lucide-react';

import { useRemoteData } from '@/shared/hooks/useRemoteData';
import { cn } from '@/shared/lib/utils';
import {
  AsyncState,
  Badge,
  Button,
  Label,
  OptionSelect,
  PageControls,
} from '@/shared/ui';
import { formatDate } from '@/shared/utils';
import type { Company } from '@/entities/company';
import {
  type CompanySubmissionFilters,
  type CompanyTask,
  listCompanyTaskSubmissions,
  type TaskSubmission,
} from '@/entities/company-task';

import { CompanyTaskSkeleton } from './CompanyTaskSkeleton';
import { TaskSubmissionDialog } from './TaskSubmissionDialog';

interface CompanyTaskSubmissionsProps {
  company: Company;
  task: CompanyTask;
  onBack: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onBusyChange: (busy: boolean) => void;
}

export const CompanyTaskSubmissions = ({
  company,
  task,
  onBack,
  onDirtyChange,
  onBusyChange,
}: CompanyTaskSubmissionsProps) => {
  const [filters, setFilters] = useState<CompanySubmissionFilters>({
    status: 'all',
    sort: 'newest',
  });
  const [offset, setOffset] = useState(0);
  const [submissionId, setSubmissionId] = useState('');
  const load = useCallback(
    (signal: AbortSignal) =>
      listCompanyTaskSubmissions(
        company.id,
        task.id,
        { ...filters, offset },
        signal,
      ),
    [company.id, task.id, filters, offset],
  );

  const query = useRemoteData(load, 0, true, { keepPreviousData: true });
  const reviewed = (submission: TaskSubmission) => {
    query.updateData((page) => ({
      ...page,
      items: page.items.map((item) =>
        item.id === submission.id ? submission : item,
      ),
    }));
    query.retry();
  };

  return (
    <div className="grid min-w-0 gap-5">
      <Button variant="ghost" onClick={onBack} className="justify-self-start">
        <ArrowLeftIcon /> Все задания компании
      </Button>
      <div className="grid gap-2">
        <h2 className="break-words text-xl font-semibold">{task.title}</h2>
        <p className="text-sm text-muted-foreground">
          Здесь доступны решения активных кандидатов с действующими согласиями
          на обработку данных и публикацию профиля.
        </p>
      </div>
      <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="company-submission-status">Статус решения</Label>
          <OptionSelect
            id="company-submission-status"
            value={filters.status ?? 'all'}
            options={[
              { value: 'all', label: 'Все решения' },
              { value: 'submitted', label: 'Ожидают проверки' },
              { value: 'reviewed', label: 'Проверены' },
            ]}
            onValueChange={(value) => {
              setOffset(0);
              setFilters((current) => ({
                ...current,
                status: value as CompanySubmissionFilters['status'],
              }));
            }}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="company-submission-sort">Порядок</Label>
          <OptionSelect
            id="company-submission-sort"
            value={filters.sort ?? 'newest'}
            options={[
              { value: 'newest', label: 'Сначала новые' },
              { value: 'score', label: 'Сначала высокая оценка' },
            ]}
            onValueChange={(value) => {
              setOffset(0);
              setFilters((current) => ({
                ...current,
                sort: value as CompanySubmissionFilters['sort'],
              }));
            }}
          />
        </div>
        <Button
          variant="outline"
          disabled={query.loading}
          onClick={query.retry}
        >
          Обновить
        </Button>
      </div>
      {query.loading && !query.data && <CompanyTaskSkeleton />}
      {query.loading && query.data && (
        <span role="status" className="sr-only">
          Обновляем решения…
        </span>
      )}
      {query.error && (
        <AsyncState
          error
          title="Не удалось загрузить решения"
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
          {!query.data.items.length && (
            <AsyncState
              title="Решений пока нет"
              description="Попробуйте другой статус. Здесь появятся доступные ответы кандидатов на это задание."
            />
          )}
          <div className="grid gap-3">
            {query.data.items.map((submission) => (
              <article
                key={submission.id}
                className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="grid min-w-0 gap-2">
                  <h3 className="font-semibold">
                    Кандидат {submission.candidateId.slice(0, 8)}
                  </h3>
                  <p className="break-all text-sm text-muted-foreground">
                    {submission.file.originalName}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        submission.status === 'reviewed'
                          ? 'success'
                          : 'secondary'
                      }
                    >
                      {submission.status === 'reviewed'
                        ? 'Проверено'
                        : 'Ожидает проверки'}
                    </Badge>
                    {submission.score !== null && (
                      <span className="text-sm font-medium">
                        {submission.score} из 100
                      </span>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {formatDate(submission.submittedAt)}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  disabled={query.loading}
                  onClick={() => setSubmissionId(submission.id)}
                  className="self-start sm:self-auto"
                >
                  Посмотреть решение
                </Button>
              </article>
            ))}
          </div>
          <PageControls
            offset={query.data.offset}
            count={query.data.items.length}
            total={query.data.total}
            pending={query.loading}
            onPage={setOffset}
          />
        </div>
      )}
      {submissionId && (
        <TaskSubmissionDialog
          key={submissionId}
          company={company}
          taskId={task.id}
          submissionId={submissionId}
          onClose={() => setSubmissionId('')}
          onReviewed={reviewed}
          onUnavailable={query.retry}
          onDirtyChange={onDirtyChange}
          onBusyChange={onBusyChange}
        />
      )}
    </div>
  );
};
