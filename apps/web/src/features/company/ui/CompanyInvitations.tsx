import { Controller } from 'react-hook-form';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  OptionSelect,
  PageControls,
  RemoteState,
} from '@/shared/ui';
import { formatDate } from '@/shared/utils';
import { MEMBER_ROLE_LABELS } from '@/entities/company';

import { type useCompanyTeam } from '../model';

const STATUS = {
  pending: 'Ожидает принятия',
  accepted: 'Принято',
  revoked: 'Отозвано',
  expired: 'Истекло',
};
interface CompanyInvitationsProps {
  invitations: ReturnType<typeof useCompanyTeam>['invitations'];
  mutation: ReturnType<typeof useCompanyTeam>['mutation'];
  form: ReturnType<typeof useCompanyTeam>['form'];
  dirty: boolean;
  created: ReturnType<typeof useCompanyTeam>['created'];
  invitationOffset: number;
  setInvitationOffset: (offset: number) => void;
  handleFormSubmit: ReturnType<typeof useCompanyTeam>['handleFormSubmit'];
  handleCopyInvitation: () => void;
  handleRemove: ReturnType<typeof useCompanyTeam>['handleRemove'];
}
export const CompanyInvitations = ({
  invitations,
  mutation,
  form,
  dirty,
  created,
  invitationOffset,
  setInvitationOffset,
  handleFormSubmit,
  handleCopyInvitation,
  handleRemove,
}: CompanyInvitationsProps) => {
  return (
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
        <RemoteState
          {...invitations}
          empty={invitations.data?.items.length === 0}
          emptyTitle="Приглашений пока нет"
        />
        {invitations.data && (
          <>
            {invitations.data.items.map((invitation) => (
              <article
                key={invitation.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-all font-medium">{invitation.email}</p>
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
  );
};
