'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { useGuardedRouter } from '@/shared/hooks';
import { Button, StaggerItem } from '@/shared/ui';
import { adminOperationsSchemas, queryString } from '@/entities/admin';
import {
  AdminAnimatedList,
  AdminListLoading,
  AdminListViewport,
  AdminPanel,
  AuditFilters,
  auditFiltersSchema,
  type AuditFilterValues as FilterValues,
  auditPeriodSchema,
  auditSourceLabels,
  ErrorNotice,
  getOperationOffset,
  OperationStatus,
  Pagination,
  useAdminQuery,
} from '@/features/admin';

import { adminDate } from '../lib';
import { AdminPageHeader } from './AdminPageHeader';

const fieldNames = [
  'source',
  'actor_id',
  'entity_type',
  'entity_id',
  'action',
  'from',
  'to',
] as const;
const localDate = (value: string) =>
  Number.isFinite(Date.parse(value))
    ? new Date(Date.parse(value) + 3 * 3600000).toISOString().slice(0, 19)
    : value;
const entitySection: Record<string, string> = {
  company: 'companies',
  user: 'users',
  need: 'needs',
  task: 'tasks',
  company_task: 'tasks',
  offer: 'offers',
  assessment_attempt: 'attempts',
};
export const AuditPage = () => {
  const params = useSearchParams();
  const router = useGuardedRouter();
  const raw = Object.fromEntries(
    fieldNames.map((key) => [key, params.get(key) ?? '']),
  );
  const values = {
    ...raw,
    from: raw.from ? localDate(raw.from) : '',
    to: raw.to ? localDate(raw.to) : '',
  } as FilterValues;
  const parsed = auditFiltersSchema.safeParse(values);
  const validDates = auditPeriodSchema.safeParse({
    from: raw.from,
    to: raw.to,
  }).success;
  const offset = getOperationOffset(params);
  const query = useAdminQuery(
    parsed.success && validDates
      ? `/audit-events?${queryString({ ...raw, limit: 20, offset })}`
      : null,
    adminOperationsSchemas.audit,
  );
  const apply = (filters: FilterValues) =>
    router.push(
      `/admin/audit?${queryString({ ...filters, from: filters.from ? new Date(`${filters.from}+03:00`).toISOString() : '', to: filters.to ? new Date(`${filters.to}+03:00`).toISOString() : '' })}`,
      { scroll: false },
    );
  return (
    <div className="grid min-w-0 gap-6">
      <AdminPageHeader
        title="Журнал действий"
        description="Проверки, модерация, изменения справочников и события платформы."
        action={
          <Button
            variant="outline"
            disabled={query.loading}
            onClick={query.reload}
          >
            Обновить
          </Button>
        }
      />
      <AdminPanel>
        <AuditFilters
          key={params.toString()}
          values={values}
          onApply={apply}
          onReset={() => router.push('/admin/audit', { scroll: false })}
        />
      </AdminPanel>
      <AdminPanel className="relative">
        <ErrorNotice error={query.error} onRetry={query.reload} />
        {(!parsed.success || !validDates) && (
          <p role="alert" className="text-sm text-destructive">
            Исправьте значения фильтров или сбросьте их.
          </p>
        )}
        <AdminListViewport loading={query.loading}>
          <AdminListLoading loading={query.loading} hasData={!!query.data} />
          {parsed.success &&
            validDates &&
            !query.loading &&
            !query.error &&
            !query.data?.items.length && (
              <p className="py-8 text-center text-muted-foreground">
                Событий не найдено
              </p>
            )}
          <AdminAnimatedList>
            {query.data?.items.map((event) => (
              <StaggerItem
                key={`${event.source}:${event.id}`}
                className="grid min-w-0 gap-3 py-5 wrap-anywhere"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-medium">{event.action}</h2>
                  <time
                    dateTime={event.created_at}
                    className="text-xs text-muted-foreground"
                  >
                    {adminDate(event.created_at)}
                  </time>
                </div>
                <p className="text-xs text-muted-foreground">
                  {auditSourceLabels[event.source]} ·{' '}
                  {
                    {
                      admin: 'Администратор',
                      user: 'Пользователь',
                      system: 'Система',
                    }[event.actor_kind]
                  }
                  {event.actor_id && `: ${event.actor_id}`}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {event.entity_type}
                  </span>
                  {event.entity_id &&
                    (entitySection[event.entity_type] ? (
                      <Link
                        href={`/admin/${entitySection[event.entity_type]}/${encodeURIComponent(event.entity_id)}`}
                        className="text-brand-text hover:underline"
                      >
                        {event.entity_id}
                      </Link>
                    ) : (
                      <span>{event.entity_id}</span>
                    ))}
                </div>
                {(event.old_status || event.new_status) && (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {event.old_status && (
                      <OperationStatus value={event.old_status} />
                    )}
                    <span aria-label="Изменено на">→</span>
                    {event.new_status && (
                      <OperationStatus value={event.new_status} />
                    )}
                  </div>
                )}
                {event.reason && (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {event.reason}
                  </p>
                )}
              </StaggerItem>
            ))}
          </AdminAnimatedList>
        </AdminListViewport>
        <Pagination
          offset={offset}
          count={query.data?.items.length ?? 0}
          total={query.data?.total}
          loading={query.loading}
          onChange={(next) =>
            router.push(
              `/admin/audit?${queryString({ ...raw, offset: next })}`,
              { scroll: false },
            )
          }
        />
      </AdminPanel>
    </div>
  );
};
