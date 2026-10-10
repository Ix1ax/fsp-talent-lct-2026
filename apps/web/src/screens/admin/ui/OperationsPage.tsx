'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { useGuardedRouter } from '@/shared/hooks';
import { Button, StaggerItem } from '@/shared/ui';
import {
  type AdminAssessmentAttempt,
  type AdminCompany,
  type AdminCompanyTask,
  type AdminNeed,
  type AdminOffer,
  adminOperationsSchemas,
  type AdminUser,
  type Page,
  queryString,
} from '@/entities/admin';
import {
  AdminAnimatedList,
  AdminListLoading,
  AdminListViewport,
  AdminPanel,
  adminUserLabel,
  ErrorNotice,
  getOperationFilters,
  getOperationOffset,
  operationConfig,
  OperationFilters,
  operationFiltersSchema,
  type OperationSection,
  OperationStatus,
  Pagination,
  useAdminQuery,
  userRoleLabels,
} from '@/features/admin';

import { adminDate } from '../lib';
import { AdminPageHeader } from './AdminPageHeader';

type OperationItem =
  | AdminCompany
  | AdminUser
  | AdminNeed
  | AdminOffer
  | AdminCompanyTask
  | AdminAssessmentAttempt;
interface OperationsPageProps {
  section: OperationSection;
}
const itemTitle = (item: OperationItem) => {
  if ('name' in item) return item.name;
  if ('title' in item) return item.title;
  if ('role' in item) return adminUserLabel(item);
  return item.stack_name ?? 'Попытка тестирования';
};
const itemDate = (item: OperationItem) => {
  if ('created_at' in item) return item.created_at;
  if ('published_at' in item) return item.published_at;
  return item.started_at;
};
export const OperationsPage = ({ section }: OperationsPageProps) => {
  const params = useSearchParams();
  const router = useGuardedRouter();
  const config = operationConfig[section];
  const filters = getOperationFilters(section, params);
  const parsed = operationFiltersSchema.safeParse(filters);
  const offset = getOperationOffset(params);
  const list = useAdminQuery<Page<OperationItem>>(
    parsed.success
      ? `${config.endpoint}?${queryString({ ...parsed.data, limit: 20, offset })}`
      : null,
    adminOperationsSchemas[section],
  );
  const navigate = (values: Record<string, string | number>) =>
    router.push(`/admin/${section}?${queryString(values)}`, { scroll: false });
  return (
    <div className="grid min-w-0 gap-6">
      <AdminPageHeader
        title={config.title}
        description={config.description}
        action={
          <Button
            variant="outline"
            disabled={list.loading}
            onClick={list.reload}
          >
            Обновить
          </Button>
        }
      />
      <AdminPanel>
        <OperationFilters
          key={`${section}:${params.toString()}`}
          section={section}
          values={filters}
          onApply={(values) => navigate(values)}
          onReset={() => router.push(`/admin/${section}`, { scroll: false })}
        />
      </AdminPanel>
      <AdminPanel className="relative">
        {!parsed.success && (
          <p role="alert" className="text-sm text-destructive">
            В фильтрах некорректные значения. Исправьте их или сбросьте фильтры.
          </p>
        )}
        <ErrorNotice error={list.error} onRetry={list.reload} />
        <p className="sr-only" role="status" aria-live="polite">
          {list.loading
            ? 'Загружаем список…'
            : `Найдено записей: ${list.data?.total ?? 0}`}
        </p>
        <AdminListViewport loading={list.loading}>
          <AdminListLoading loading={list.loading} hasData={!!list.data} />
          {parsed.success &&
            !list.loading &&
            !list.error &&
            !list.data?.items.length && (
              <p className="py-8 text-center text-muted-foreground">
                Записей не найдено. Попробуйте изменить фильтры.
              </p>
            )}
          <AdminAnimatedList>
            {list.data?.items.map((item) => (
              <StaggerItem
                key={item.id}
                className="grid min-w-0 gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="grid min-w-0 gap-2 wrap-anywhere">
                  <Link
                    href={`/admin/${section}/${item.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {itemTitle(item)}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {'role' in item && `${userRoleLabels[item.role]} · `}
                    {'company_name' in item && `${item.company_name} · `}
                    {'inn' in item && `ИНН: ${item.inn ?? 'не указан'} · `}
                    {adminDate(itemDate(item))}
                  </p>
                  {'email' in item && (
                    <div className="grid gap-1 text-sm text-muted-foreground">
                      {item.email && <p>Почта аккаунта: {item.email}</p>}
                      {item.contact_email &&
                        item.contact_email !== item.email && (
                          <p>Контактная почта: {item.contact_email}</p>
                        )}
                      {!item.full_name && (
                        <p className="text-xs">Имя не указано</p>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-caption">
                    {'candidate_id' in item
                      ? `Профиль кандидата: ${item.candidate_id}`
                      : `ID: ${item.id}`}
                  </p>
                  {'submissions_count' in item && (
                    <p className="text-sm text-muted-foreground">
                      Решений: {item.submissions_count}
                    </p>
                  )}
                  {'score_percent' in item && (
                    <p className="text-sm text-muted-foreground">
                      Результат:{' '}
                      {item.score_percent === null
                        ? 'ещё нет'
                        : `${item.score_percent}%`}
                    </p>
                  )}
                  {'blocked_reason' in item && item.status === 'blocked' && (
                    <div className="grid gap-1 text-sm">
                      <p className="text-xs text-muted-foreground">
                        Блокировка: {adminDate(item.blocked_at)}
                      </p>
                      <p className="line-clamp-2 whitespace-pre-wrap text-destructive">
                        Причина: {item.blocked_reason ?? 'Не указана'}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex max-w-full flex-wrap items-center gap-2 sm:max-w-72 sm:justify-end">
                  {'verification_status' in item && (
                    <OperationStatus
                      value={item.status}
                      label={
                        item.status === 'blocked' ? 'Заблокирована' : 'Активна'
                      }
                    />
                  )}
                  <OperationStatus
                    value={
                      'verification_status' in item
                        ? item.verification_status
                        : item.status
                    }
                  />
                  {'moderation_status' in item && (
                    <OperationStatus value={item.moderation_status} />
                  )}
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/${section}/${item.id}`}>Открыть</Link>
                  </Button>
                </div>
              </StaggerItem>
            ))}
          </AdminAnimatedList>
        </AdminListViewport>
        <Pagination
          offset={offset}
          count={list.data?.items.length ?? 0}
          total={list.data?.total}
          loading={list.loading}
          onChange={(next) => navigate({ ...filters, offset: next })}
        />
      </AdminPanel>
    </div>
  );
};
