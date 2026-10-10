import { useState } from 'react';

import { StaggerItem } from '@/shared/ui';
import { type AdminCompany, adminOperationsSchemas } from '@/entities/admin';
import {
  AdminAnimatedList,
  AdminFileDownload,
  AdminListLoading,
  AdminListViewport,
  AdminPanel,
  adminUserLabel,
  ErrorNotice,
  memberRoleLabels,
  OperationStatus,
  Pagination,
  useAdminQuery,
  userRoleLabels,
} from '@/features/admin';

import { adminDate, adminNumber } from '../lib';
import { AdminEntityLink } from './OperationDetailsLayout';

export const CompanyRelatedLists = ({ company }: { company: AdminCompany }) => {
  const [filesOffset, setFilesOffset] = useState(0);
  const [membersOffset, setMembersOffset] = useState(0);
  const files = useAdminQuery(
    `/companies/${company.id}/files?limit=20&offset=${filesOffset}`,
    adminOperationsSchemas.files,
  );
  const members = useAdminQuery(
    `/companies/${company.id}/members?limit=20&offset=${membersOffset}`,
    adminOperationsSchemas.members,
  );
  return (
    <>
      <AdminPanel className="relative">
        <h2 className="text-lg font-medium">Документы и файлы</h2>
        <p className="text-sm text-muted-foreground">
          В текущей заявке: {company.verification_document_ids.length}{' '}
          документов. Файлы заявки отмечены в списке.
        </p>
        <ErrorNotice error={files.error} onRetry={files.reload} />
        <AdminListViewport loading={files.loading}>
          <AdminListLoading loading={files.loading} hasData={!!files.data} />
          {!files.loading && !files.error && !files.data?.items.length && (
            <p className="py-4 text-muted-foreground">Файлов нет</p>
          )}
          <AdminAnimatedList>
            {files.data?.items.map((file) => (
              <StaggerItem
                key={file.id}
                className="grid min-w-0 gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="min-w-0 wrap-anywhere">
                  <p className="font-medium">{file.original_name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {file.purpose === 'company_document'
                      ? 'Документ'
                      : 'Логотип'}{' '}
                    · {adminNumber(Math.ceil(file.size_bytes / 1024))} КБ ·{' '}
                    {adminDate(file.created_at)}
                  </p>
                  {company.verification_document_ids.includes(file.id) && (
                    <p className="mt-2 text-xs text-brand-text">
                      Документ текущей заявки
                    </p>
                  )}
                  <p className="mt-2 text-xs text-caption">ID: {file.id}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <OperationStatus value={file.status} />
                  <AdminFileDownload
                    disabled={file.status !== 'ready'}
                    path={`/companies/${company.id}/files/${file.id}/download`}
                    name={file.original_name}
                  />
                </div>
              </StaggerItem>
            ))}
          </AdminAnimatedList>
        </AdminListViewport>
        <Pagination
          offset={filesOffset}
          count={files.data?.items.length ?? 0}
          total={files.data?.total}
          loading={files.loading}
          onChange={setFilesOffset}
        />
      </AdminPanel>
      <AdminPanel className="relative">
        <h2 className="text-lg font-medium">Участники компании</h2>
        <ErrorNotice error={members.error} onRetry={members.reload} />
        <AdminListViewport loading={members.loading}>
          <AdminListLoading
            loading={members.loading}
            hasData={!!members.data}
          />
          {!members.loading &&
            !members.error &&
            !members.data?.items.length && (
              <p className="py-4 text-muted-foreground">Участников нет</p>
            )}
          <AdminAnimatedList>
            {members.data?.items.map((member) => (
              <StaggerItem
                key={member.user_id}
                className="grid min-w-0 gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="min-w-0 wrap-anywhere">
                  <p className="font-medium">
                    <AdminEntityLink
                      section="users"
                      id={member.user_id}
                      label={adminUserLabel({
                        ...member,
                        role: member.user_role,
                      })}
                    />
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {memberRoleLabels[member.role]} ·{' '}
                    {userRoleLabels[member.user_role]}
                  </p>
                  {member.email && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Почта аккаунта: {member.email}
                    </p>
                  )}
                  {member.contact_email &&
                    member.contact_email !== member.email && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Контактная почта: {member.contact_email}
                      </p>
                    )}
                  {member.user_status === 'blocked' && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-destructive">
                      Причина блокировки:{' '}
                      {member.user_blocked_reason ?? 'Не указана'}
                    </p>
                  )}
                  <p className="mt-2 text-sm">
                    <span className="text-xs text-muted-foreground">
                      ID:{' '}
                      <span className="font-mono select-all">
                        {member.user_id}
                      </span>
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    В команде с {adminDate(member.joined_at)}
                  </p>
                </div>
                <div className="grid gap-2 text-xs text-muted-foreground">
                  <span>
                    Членство: <OperationStatus value={member.status} />
                  </span>
                  <span>
                    Пользователь: <OperationStatus value={member.user_status} />
                  </span>
                </div>
              </StaggerItem>
            ))}
          </AdminAnimatedList>
        </AdminListViewport>
        <Pagination
          offset={membersOffset}
          count={members.data?.items.length ?? 0}
          total={members.data?.total}
          loading={members.loading}
          onChange={setMembersOffset}
        />
      </AdminPanel>
    </>
  );
};
