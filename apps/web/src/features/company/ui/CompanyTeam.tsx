'use client';

import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { EMPLOYER_DRAFT_ROUTES, EMPLOYER_DRAFT_SCOPE } from '@/shared/contants';
import { useAsyncMutation, useFormUnsavedChanges } from '@/shared/hooks';
import { useRemoteData } from '@/shared/hooks/useRemoteData';
import {
  AsyncState,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDeleteDialog,
  Input,
  OptionSelect,
  toast,
} from '@/shared/ui';
import { PageControls } from '@/shared/ui/workspace/PageControls';
import { RemoteState } from '@/shared/ui/workspace/RemoteState';
import { formatDate } from '@/shared/utils';
import type {
  Company,
  CompanyInvitation,
  CompanyMember,
  TeamRole,
} from '@/entities/company';
import { MEMBER_ROLE_LABELS } from '@/entities/company';

import { invitationSchema } from '../constants';
import type { CompanyManagementApi } from '../model';

interface CompanyTeamProps {
  active?: boolean;
  company: Company;
  userId: string;
  api: CompanyManagementApi;
  onBusyChange: (value: boolean) => void;
  onDirtyChange: (value: boolean) => void;
  onCompanyChange: () => Promise<void>;
}

const STATUS = {
  pending: 'Ожидает принятия',
  accepted: 'Принято',
  revoked: 'Отозвано',
  expired: 'Истекло',
};

export const CompanyTeam = ({
  active = true,
  company,
  userId,
  api,
  onBusyChange,
  onDirtyChange,
  onCompanyChange,
}: CompanyTeamProps) => {
  const [memberOffset, setMemberOffset] = useState(0);
  const [invitationOffset, setInvitationOffset] = useState(0);
  const owner = company.memberRole === 'owner';
  const membersLoad = useCallback(
    (signal: AbortSignal) =>
      api.getCompanyMembers(company.id, memberOffset, signal),
    [api, company.id, memberOffset],
  );

  const invitationsLoad = useCallback(
    (signal: AbortSignal) =>
      owner
        ? api.getCompanyInvitations(company.id, invitationOffset, signal)
        : Promise.resolve({ items: [], limit: 20, offset: 0 }),
    [api, company.id, invitationOffset, owner],
  );

  const members = useRemoteData(membersLoad, 0, active);
  const invitations = useRemoteData(invitationsLoad, 0, active);
  const mutation = useAsyncMutation();
  const [created, setCreated] = useState<CompanyInvitation | null>(null);
  const [remove, setRemove] = useState<
    CompanyMember | CompanyInvitation | null
  >(null);

  const form = useForm<{ email: string; role: TeamRole }>({
    resolver: zodResolver(invitationSchema),
    defaultValues: { email: '', role: 'recruiter' },
  });

  const { dirty, markSaved } = useFormUnsavedChanges(form, {
    preserveWithin: EMPLOYER_DRAFT_ROUTES,
    scopeSearchParams: EMPLOYER_DRAFT_SCOPE,
  });

  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    onBusyChange(mutation.pending);
    return () => onBusyChange(false);
  }, [mutation.pending, onBusyChange]);

  const refresh = () => {
    members.retry();
    invitations.retry();
  };

  const perform = (operation: () => Promise<unknown>) =>
    void mutation.run(async () => {
      try {
        await operation();
      } finally {
        refresh();
      }
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
          <RemoteState {...members} />
          {members.data && (
            <>
              {!members.data.items.length && (
                <AsyncState title="Участников нет" />
              )}
              {members.data.items.map((member) => (
                <article
                  key={member.userId}
                  className="grid gap-3 rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">
                      {member.userId === userId ? 'Вы' : 'Сотрудник'}
                    </p>
                    <p className="mt-1 break-all text-xs text-muted-foreground">
                      ID: {member.userId}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {MEMBER_ROLE_LABELS[member.role]} ·{' '}
                    {member.status === 'active' ? 'Активен' : 'Отключён'} · В
                    команде с {formatDate(member.joinedAt)}
                  </p>
                  {owner &&
                    member.role !== 'owner' &&
                    member.status === 'active' && (
                      <div className="flex flex-wrap gap-3">
                        <label className="flex items-center gap-2 text-sm">
                          Роль
                          <OptionSelect
                            aria-label={`Роль сотрудника ${member.userId}`}
                            className="w-auto"
                            value={member.role}
                            disabled={mutation.pending}
                            onValueChange={(value) =>
                              perform(async () => {
                                await api.updateCompanyMember(
                                  company.id,
                                  member.userId,
                                  value as TeamRole,
                                );
                                await onCompanyChange();
                                toast.success('Роль изменена');
                              })
                            }
                            options={[
                              { value: 'recruiter', label: 'Рекрутер' },
                              { value: 'viewer', label: 'Наблюдатель' },
                            ]}
                          />
                        </label>
                        <Button
                          variant="ghost"
                          disabled={mutation.pending}
                          onClick={() => {
                            mutation.clearError();
                            setRemove(member);
                          }}
                        >
                          Отключить
                        </Button>
                      </div>
                    )}
                  {member.status === 'inactive' && (
                    <p className="text-sm text-muted-foreground">
                      Для возвращения в команду потребуется новое приглашение.
                    </p>
                  )}
                </article>
              ))}
              <PageControls
                offset={memberOffset}
                count={members.data.items.length}
                pending={mutation.pending}
                onPage={setMemberOffset}
              />
            </>
          )}
        </CardContent>
      </Card>
      {owner && (
        <Card>
          <CardHeader>
            <CardTitle>Приглашения</CardTitle>
            <CardDescription>
              Пригласите сотрудника по email и передайте ему ссылку. Приглашение
              действует до указанной даты.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <form
              className="grid gap-4"
              onSubmit={form.handleSubmit((input) =>
                perform(async () => {
                  const invitation = await api.createCompanyInvitation(
                    company.id,
                    input,
                  );
                  setCreated(invitation);
                  form.reset({ email: '', role: 'recruiter' });
                  markSaved();
                  setInvitationOffset(0);
                  toast.success('Приглашение создано');
                }),
              )}
            >
              <fieldset
                disabled={mutation.pending}
                className="grid gap-4 sm:grid-cols-2"
              >
                <label className="grid gap-2 text-sm">
                  Email сотрудника
                  <Input
                    {...form.register('email')}
                    type="email"
                    maxLength={254}
                    aria-invalid={!!form.formState.errors.email}
                  />
                  {form.formState.errors.email && (
                    <span role="alert" className="text-destructive">
                      {form.formState.errors.email.message}
                    </span>
                  )}
                </label>
                <label className="grid gap-2 text-sm">
                  Роль
                  <Controller
                    name="role"
                    control={form.control}
                    render={({ field }) => (
                      <OptionSelect
                        aria-label="Роль приглашённого сотрудника"
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={mutation.pending}
                        options={[
                          { value: 'recruiter', label: 'Рекрутер' },
                          { value: 'viewer', label: 'Наблюдатель' },
                        ]}
                      />
                    )}
                  />
                </label>
              </fieldset>
              <Button
                type="submit"
                disabled={mutation.pending || !dirty}
                size="lg"
                className="sm:justify-self-start"
              >
                {mutation.pending ? 'Создаём…' : 'Пригласить сотрудника'}
              </Button>
            </form>
            {created?.token && (
              <div
                role="status"
                className="grid gap-3 rounded-lg border bg-accent/30 p-4"
              >
                <p className="font-medium">Передайте приглашение сотруднику</p>
                <p className="text-sm text-muted-foreground">
                  Письмо автоматически не отправляется. Сохраните ссылку сейчас:
                  токен доступен только после создания.
                </p>
                <Input
                  aria-label="Токен приглашения"
                  readOnly
                  value={created.token}
                />
                <Button
                  variant="outline"
                  disabled={mutation.pending}
                  onClick={() =>
                    void mutation
                      .run(async () => {
                        await navigator.clipboard.writeText(
                          `${window.location.origin}/employer/invitation?token=${encodeURIComponent(created.token!)}`,
                        );
                        toast.success('Ссылка скопирована');
                      })
                      .catch(() => {})
                  }
                >
                  Скопировать ссылку
                </Button>
              </div>
            )}
            <RemoteState {...invitations} />
            {invitations.data && (
              <>
                {!invitations.data.items.length && (
                  <AsyncState title="Приглашений пока нет" />
                )}
                {invitations.data.items.map((invitation) => (
                  <article
                    key={invitation.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="break-all font-medium">
                        {invitation.email}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {MEMBER_ROLE_LABELS[invitation.role]} ·{' '}
                        {STATUS[invitation.status]} · До{' '}
                        {formatDate(invitation.expiresAt)}
                      </p>
                    </div>
                    {invitation.status === 'pending' && (
                      <Button
                        variant="outline"
                        disabled={mutation.pending}
                        onClick={() => {
                          mutation.clearError();
                          setRemove(invitation);
                        }}
                      >
                        Отозвать
                      </Button>
                    )}
                  </article>
                ))}
                <PageControls
                  offset={invitationOffset}
                  count={invitations.data.items.length}
                  pending={mutation.pending}
                  onPage={setInvitationOffset}
                />
              </>
            )}
          </CardContent>
        </Card>
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
          onClose={() => setRemove(null)}
          onConfirm={async () => {
            try {
              await mutation.run(async () => {
                try {
                  if ('userId' in remove)
                    await api.disableCompanyMember(company.id, remove.userId);
                  else {
                    await api.revokeCompanyInvitation(company.id, remove.id);
                    if (created?.id === remove.id) setCreated(null);
                  }
                  await onCompanyChange();
                } finally {
                  refresh();
                }
              });
              return true;
            } catch {
              return false;
            }
          }}
        />
      )}
    </div>
  );
};
