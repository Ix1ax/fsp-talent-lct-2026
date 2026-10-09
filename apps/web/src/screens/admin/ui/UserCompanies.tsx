import { useState } from 'react';

import { Button, StaggerItem } from '@/shared/ui';
import { adminOperationsSchemas } from '@/entities/admin';
import {
  AdminAnimatedList,
  AdminListLoading,
  AdminListViewport,
  AdminPanel,
  ErrorNotice,
  memberRoleLabels,
  OperationStatus,
  Pagination,
  useAdminQuery,
} from '@/features/admin';

import { adminDate } from '../lib';
import { AdminEntityLink } from './OperationDetailsLayout';

interface UserCompaniesProps {
  userId: string;
}
export const UserCompanies = ({ userId }: UserCompaniesProps) => {
  const [offset, setOffset] = useState(0);
  const query = useAdminQuery(
    `/users/${userId}/companies?limit=20&offset=${offset}`,
    adminOperationsSchemas.userCompanies,
  );
  return (
    <AdminPanel className="relative">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium">Компании пользователя</h2>
        <Button
          variant="outline"
          size="sm"
          disabled={query.loading}
          onClick={query.reload}
        >
          Обновить компании
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Включая прежние участия. Доступ компании и доступ пользователя
        управляются отдельно.
      </p>
      <ErrorNotice error={query.error} onRetry={query.reload} />
      <AdminListViewport loading={query.loading}>
        <AdminListLoading loading={query.loading} hasData={!!query.data} />
        {!query.loading && !query.error && !query.data?.items.length && (
          <p className="py-4 text-muted-foreground">
            Пользователь не состоит в компаниях
          </p>
        )}
        <AdminAnimatedList>
          {query.data?.items.map((company) => (
            <StaggerItem
              key={company.company_id}
              className="grid min-w-0 gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="grid min-w-0 gap-2 wrap-anywhere">
                <p className="font-medium">
                  <AdminEntityLink
                    section="companies"
                    id={company.company_id}
                    label={company.company_name}
                  />
                </p>
                <p className="text-sm text-muted-foreground">
                  {memberRoleLabels[company.role]} · с{' '}
                  {adminDate(company.joined_at)}
                </p>
                <p className="text-xs text-muted-foreground">
                  ID компании:{' '}
                  <span className="font-mono select-all">
                    {company.company_id}
                  </span>
                </p>
              </div>
              <div className="grid gap-2 text-xs text-muted-foreground">
                <span>
                  Участие: <OperationStatus value={company.status} />
                </span>
                <span>
                  Компания:{' '}
                  <OperationStatus
                    value={company.company_status}
                    label={
                      company.company_status === 'blocked'
                        ? 'Заблокирована'
                        : 'Активна'
                    }
                  />
                </span>
                <span>
                  Подтверждение:{' '}
                  <OperationStatus value={company.verification_status} />
                </span>
              </div>
            </StaggerItem>
          ))}
        </AdminAnimatedList>
      </AdminListViewport>
      <Pagination
        offset={offset}
        count={query.data?.items.length ?? 0}
        total={query.data?.total}
        loading={query.loading}
        onChange={setOffset}
      />
    </AdminPanel>
  );
};
