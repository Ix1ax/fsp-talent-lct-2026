'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDeleteDialog,
  PageControls,
  RemoteState,
} from '@/shared/ui';
import { type Company } from '@/entities/company';

import { type CompanyManagementApi, useCompanyTeam } from '../model';
import { CompanyInvitations } from './CompanyInvitations';
import { MemberItem } from './MemberItem';

interface CompanyTeamProps {
  active?: boolean;
  company: Company;
  userId: string;
  api: CompanyManagementApi;
  onBusyChange: (value: boolean) => void;
  onDirtyChange: (value: boolean) => void;
  onCompanyChange: () => Promise<void>;
}

export const CompanyTeam = ({
  active = true,
  company,
  userId,
  api,
  onBusyChange,
  onDirtyChange,
  onCompanyChange,
}: CompanyTeamProps) => {
  const {
    memberOffset,
    setMemberOffset,
    invitationOffset,
    setInvitationOffset,
    owner,
    members,
    invitations,
    mutation,
    created,
    remove,
    form,
    dirty,
    handleRoleChange,
    handleFormSubmit,
    handleCopyInvitation,
    handleRemove,
    handleCloseRemove,
    handleConfirmRemove,
  } = useCompanyTeam({
    active,
    company,
    api,
    onBusyChange,
    onDirtyChange,
    onCompanyChange,
  });
  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Сотрудники компании</CardTitle>
          <CardDescription>
            Владелец управляет доступом. Рекрутер работает с потребностями и
            предложениями, наблюдатель просматривает данные.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <RemoteState
            {...members}
            empty={members.data?.items.length === 0}
            emptyTitle="Участников нет"
          />
          {members.data && (
            <>
              {members.data.items.map((member) => (
                <MemberItem
                  key={member.userId}
                  member={member}
                  userId={userId}
                  owner={owner}
                  pending={mutation.pending}
                  onRoleChange={handleRoleChange}
                  onRemove={handleRemove}
                />
              ))}
              <PageControls
                offset={memberOffset}
                count={members.data.items.length}
                hasMore={members.data.hasMore}
                pending={mutation.pending}
                onPage={setMemberOffset}
              />
            </>
          )}
        </CardContent>
      </Card>
      {owner && (
        <CompanyInvitations
          invitations={invitations}
          mutation={mutation}
          form={form}
          dirty={dirty}
          created={created}
          invitationOffset={invitationOffset}
          setInvitationOffset={setInvitationOffset}
          handleFormSubmit={handleFormSubmit}
          handleCopyInvitation={handleCopyInvitation}
          handleRemove={handleRemove}
        />
      )}
      {mutation.error && (
        <p role="alert" className="text-sm text-destructive">
          {mutation.error}
        </p>
      )}
      {remove && (
        <ConfirmDeleteDialog
          confirmLabel={'userId' in remove ? 'Отключить' : 'Отозвать'}
          busyLabel={'userId' in remove ? 'Отключаем…' : 'Отзываем…'}
          title={
            'userId' in remove
              ? 'Отключить сотрудника?'
              : 'Отозвать приглашение?'
          }
          description={
            'userId' in remove
              ? 'Сотрудник потеряет доступ к компании. Вернуть доступ можно новым приглашением.'
              : 'По этой ссылке больше нельзя будет присоединиться к компании.'
          }
          busy={mutation.pending}
          error={mutation.error}
          onClose={handleCloseRemove}
          onConfirm={handleConfirmRemove}
        />
      )}
    </div>
  );
};
