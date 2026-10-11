import { useState } from 'react';
import Link from 'next/link';

import { Button } from '@/shared/ui';
import { formatPercent } from '@/shared/utils';
import { adminAssessmentAttemptSchema } from '@/entities/admin';
import {
  AdminPanel,
  ErrorNotice,
  OperationStatus,
  useAdminOptions,
  useAdminQuery,
} from '@/features/admin';

import { adminDate } from '../lib';
import { DetailFields, OperationDetailsLayout } from './OperationDetailsLayout';

interface AttemptDetailsProps {
  id: string;
}

export const AttemptDetails = ({ id }: AttemptDetailsProps) => {
  const query = useAdminQuery(
    `/assessments/attempts/${id}`,
    adminAssessmentAttemptSchema,
  );
  const attempt = query.data;
  const [now] = useState(() => Date.now());
  const options = useAdminOptions(['specializations', 'grades']);
  const name = (kind: string, value: number) =>
    options.data[kind]?.find((item) => item.id === String(value))?.name ??
    `ID ${value}`;
  return (
    <OperationDetailsLayout
      section="attempts"
      title={attempt?.stack_name ?? 'Попытка тестирования'}
      hasData={!!attempt}
      loading={query.loading}
      error={query.error}
      onReload={query.reload}
    >
      {attempt && (
        <AdminPanel>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-medium">Результат тестирования</h2>
            <OperationStatus value={attempt.status} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border bg-muted/30 p-5">
              <p className="text-xs text-muted-foreground">
                Итоговый результат
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                {attempt.score_percent === null
                  ? 'Ещё нет'
                  : formatPercent(attempt.score_percent)}
              </p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-5">
              <p className="text-xs text-muted-foreground">Порог прохождения</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                {attempt.pass_score}%
              </p>
            </div>
          </div>
          <DetailFields
            fields={[
              { label: 'ID профиля кандидата', value: attempt.candidate_id },
              {
                label: 'Специализация',
                value: name('specializations', attempt.specialization_id),
              },
              { label: 'Грейд', value: name('grades', attempt.grade_id) },
              { label: 'Основной навык', value: attempt.stack_name },
              { label: 'Начало', value: adminDate(attempt.started_at) },
              {
                label: 'Срок завершения',
                value: adminDate(attempt.deadline_at),
              },
              { label: 'Завершено', value: adminDate(attempt.finished_at) },
              {
                label: 'Время на тест',
                value: `${attempt.time_limit_sec / 60} мин.`,
              },
              { label: 'ID попытки', value: id },
            ]}
          />
          {Object.entries(options.catalogs).map(([kind, state]) => (
            <ErrorNotice
              key={kind}
              error={state.error}
              onRetry={() =>
                options.reload(kind as 'specializations' | 'grades')
              }
            />
          ))}
          {attempt.status === 'active' &&
            Date.parse(attempt.deadline_at) < now && (
              <p className="text-sm text-muted-foreground">
                Срок истёк, попытка ожидает завершения штатным механизмом
                тестирования.
              </p>
            )}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={`/admin/templates/${attempt.template_id}`}>
                Шаблон теста
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link
                href={`/admin/attempts?candidate_id=${attempt.candidate_id}`}
              >
                Все попытки кандидата
              </Link>
            </Button>
          </div>
        </AdminPanel>
      )}
    </OperationDetailsLayout>
  );
};
