import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ArrowRightIcon, HistoryIcon } from 'lucide-react';

import { DYNAMIC_ROUTES } from '@/shared/contants';
import { useRemoteData } from '@/shared/hooks';
import {
  Badge,
  Button,
  FadeIn,
  PageControls,
  RemoteState,
  Stagger,
  StaggerItem,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui';
import { formatDate, formatPercent } from '@/shared/utils';
import { getAssessmentHistory } from '@/entities/assessment';
import type { Catalogs } from '@/entities/catalog';

interface AssessmentHistoryProps {
  catalogs?: Catalogs;
}
const statusLabels = {
  active: 'В процессе',
  passed: 'Пройден',
  failed: 'Не пройден',
  expired: 'Время истекло',
};
export const AssessmentHistory = ({ catalogs }: AssessmentHistoryProps) => {
  const [offset, setOffset] = useState(0);
  const load = useCallback(
    (signal: AbortSignal) =>
      getAssessmentHistory({ limit: 20, offset }, signal),
    [offset],
  );
  const query = useRemoteData(load);
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">История тестирования</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Попытки и присвоенные категории, от новых к старым.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={query.loading}
          onClick={query.retry}
        >
          Обновить историю
        </Button>
      </div>
      <RemoteState
        loading={query.loading}
        error={query.error}
        retry={query.retry}
        empty={query.data?.items.length === 0}
        emptyTitle="Попыток пока нет"
        emptyDescription="После первого теста здесь появятся результат и присвоенная категория."
      />
      {query.data && (
        <>
          <Stagger className="grid gap-3" key={offset}>
            {query.data.items.map((item) => {
              const specialization =
                item.category?.specialization ??
                catalogs?.specializations.find(
                  (value) => value.id === item.specializationId,
                )?.name ??
                `Специализация №${item.specializationId}`;
              const grade =
                item.category?.grade ??
                catalogs?.grades.find((value) => value.id === item.gradeId)
                  ?.name ??
                `Уровень №${item.gradeId}`;
              return (
                <StaggerItem
                  key={item.id}
                  className="min-w-0 rounded-xl border bg-card p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold wrap-anywhere">
                        {item.stackName ? `${item.stackName} · ` : ''}
                        {specialization} · {grade}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        <HistoryIcon
                          aria-hidden="true"
                          className="mr-1 inline size-3.5"
                        />
                        Начат {formatDate(item.startedAt)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        item.status === 'passed' ? 'success' : 'secondary'
                      }
                    >
                      {statusLabels[item.status]}
                    </Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="grid gap-1 text-sm">
                      <p>
                        Результат:{' '}
                        <span className="font-medium tabular-nums">
                          {item.scorePercent === null
                            ? 'Ещё не определён'
                            : formatPercent(item.scorePercent)}
                        </span>
                      </p>
                      {item.finishedAt && (
                        <p className="text-xs text-muted-foreground">
                          Завершён {formatDate(item.finishedAt)}
                        </p>
                      )}
                    </div>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <Button asChild variant="outline">
                          <Link
                            href={DYNAMIC_ROUTES.CANDIDATE_ASSESSMENT(item.id)}
                          >
                            {item.status === 'active'
                              ? 'Открыть попытку'
                              : 'Посмотреть результат'}
                            <ArrowRightIcon aria-hidden="true" />
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        sideOffset={6}
                        className="motion-reduce:animate-none"
                      >
                        {item.status === 'active'
                          ? 'Восстановить попытку. Если время истекло, сервер завершит её.'
                          : 'Посмотреть результат и подтверждение навыков без правильных ответов.'}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  {item.category && (
                    <FadeIn className="mt-4 border-t pt-3 text-sm">
                      <span className="text-muted-foreground">
                        Присвоена категория:{' '}
                      </span>
                      {item.category.specialization} · {item.category.grade}
                      {item.category.stackName
                        ? ` · ${item.category.stackName}`
                        : ''}
                    </FadeIn>
                  )}
                </StaggerItem>
              );
            })}
          </Stagger>
          <PageControls
            offset={query.data.offset}
            count={query.data.items.length}
            limit={query.data.limit}
            total={query.data.total}
            pending={query.loading}
            onPage={setOffset}
          />
        </>
      )}
    </div>
  );
};
