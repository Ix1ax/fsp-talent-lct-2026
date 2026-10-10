'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage';
import { EMPLOYER_DRAFT_SCOPE, STATIC_ROUTES } from '@/shared/contants';
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
  PageControls,
  RemoteState,
  toast,
} from '@/shared/ui';
import { formatDate } from '@/shared/utils';
import {
  type Company,
  type CompanyInvitation,
  type CompanyMember,
  MEMBER_ROLE_LABELS,
  type TeamRole,
} from '@/entities/company';

import { invitationSchema } from '../constants';
import type { CompanyManagementApi } from '../model';
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

type InvitationFormValues = { email: string; role: TeamRole };

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

  const form = useForm<InvitationFormValues>({
    resolver: zodResolver(invitationSchema),
    defaultValues: { email: '', role: 'recruiter' },
  });

  const { dirty, markSaved } = useFormUnsavedChanges(form, {
    preserveWithin: useMemo(
      () => [
        STATIC_ROUTES.EMPLOYER,
        STATIC_ROUTES.EMPLOYER_PROFILE,
        STATIC_ROUTES.EMPLOYER_DOCUMENTS,
        STATIC_ROUTES.EMPLOYER_TEAM,
        STATIC_ROUTES.EMPLOYER_VACANCIES,
        STATIC_ROUTES.EMPLOYER_CANDIDATES,
        STATIC_ROUTES.EMPLOYER_OFFERS,
      ],
      [],
    ),
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

  const handleOperationError = (error: unknown) => {
    toast.error(getApiErrorMessage(error));
  };

  const perform = (operation: () => Promise<unknown>) =>
    void mutation
      .run(async () => {
        try {
          await operation();
        } finally {
          refresh();
        }
      })
      .catch(handleOperationError);

  const handleRoleChange = (member: CompanyMember, value: string) => {
    perform(async () => {
      await api.updateCompanyMember(
        company.id,
        member.userId,
        value as TeamRole,
      );
      await onCompanyChange();
      toast.success('Роль изменена');
    });
  };

  const handleFormSubmit = (input: InvitationFormValues) => {
    perform(async () => {
      const invitation = await api.createCompanyInvitation(company.id, input);
      setCreated(invitation);
      form.reset({ email: '', role: 'recruiter' });
      markSaved();
      setInvitationOffset(0);
      toast.success('Приглашение создано');
    });
  };

  const handleCopyInvitation = () => {
    const token = created?.token;
    if (!token) return;

    void mutation
      .run(async () => {
        await navigator.clipboard.writeText(
          `${window.location.origin}${STATIC_ROUTES.EMPLOYER_INVITATION}?token=${encodeURIComponent(token)}`,
        );
        toast.success('Ссылка скопирована');
      })
      .catch(handleOperationError);
  };

  const handleRemove = (item: CompanyMember | CompanyInvitation) => {
    mutation.clearError();
    setRemove(item);
  };

  const handleCloseRemove = () => setRemove(null);

  const handleConfirmRemove = async (): Promise<boolean> => {
    if (!remove) return false;

    try {
      await mutation.run(async () => {
        try {
          if ('userId' in remove) {
            await api.disableCompanyMember(company.id, remove.userId);
          } else {
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
  };

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
              onSubmit={form.handleSubmit(handleFormSubmit)}
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
                  onClick={handleCopyInvitation}
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
                        onClick={() => handleRemove(invitation)}
                      >
                        Отозвать
                      </Button>
                    )}
                  </article>
                ))}
                <PageControls
                  offset={invitationOffset}
                  count={invitations.data.items.length}
                  hasMore={invitations.data.hasMore}
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
          onClose={handleCloseRemove}
          onConfirm={handleConfirmRemove}
        />
      )}
    </div>
  );
};
