'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useAsyncMutation, useFormUnsavedChanges } from '@/shared/hooks';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  toast,
} from '@/shared/ui';

import { tokenSchema } from '../constants';
import { getInvitationSubmitError } from '../lib';
import type { CompanyManagementApi } from '../model';

interface AcceptInvitationProps {
  api: CompanyManagementApi;
  onDirtyChange?: (dirty: boolean) => void;
  onAccepted: (companyId: string) => Promise<void>;
  onBusyChange: (value: boolean) => void;
}
export const AcceptInvitation = ({
  api,
  onDirtyChange,
  onAccepted,
  onBusyChange,
}: AcceptInvitationProps) => {
  const mutation = useAsyncMutation();
  const form = useForm<{ token: string }>({
    resolver: zodResolver(tokenSchema),
    defaultValues: { token: '' },
  });
  const { dirty, markSaved } = useFormUnsavedChanges(form);

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  const [done, setDone] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (token) form.reset({ token });
  }, [form]);

  useEffect(() => {
    onBusyChange(mutation.pending);
    return () => onBusyChange(false);
  }, [mutation.pending, onBusyChange]);

  return (
    <Card className="min-w-0 py-6 sm:py-8">
      <CardHeader className="gap-2 px-6">
        <CardTitle>Присоединиться к компании</CardTitle>
        <CardDescription>
          Используйте токен из приглашения. Почта вашей учётной записи должна
          совпадать с почтой приглашения.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6">
        <form
          className="grid gap-4"
          onSubmit={form.handleSubmit(({ token }) => {
            let accepted = false;
            form.clearErrors('root');
            setDone(false);
            void mutation
              .run(async () => {
                const member = await api.acceptCompanyInvitation(token);
                accepted = true;
                setDone(true);
                form.reset({ token: '' });
                markSaved();
                const query = new URLSearchParams(window.location.search);
                query.delete('token');
                window.history.replaceState(
                  null,
                  '',
                  `${window.location.pathname}?${query}`,
                );
                await onAccepted(member.companyId);
                toast.success('Вы присоединились к компании');
              })
              .catch((error: unknown) => {
                const failure = getInvitationSubmitError(error, accepted);
                if (failure)
                  form.setError(
                    failure.field,
                    {
                      type: 'server',
                      message: failure.message,
                    },
                    { shouldFocus: failure.field === 'token' },
                  );
              });
          })}
        >
          <label className="grid gap-2 text-sm">
            Токен приглашения
            <Input
              {...form.register('token')}
              disabled={mutation.pending}
              autoComplete="off"
              aria-invalid={!!form.formState.errors.token}
            />
            {form.formState.errors.token && (
              <span role="alert" className="text-destructive">
                {form.formState.errors.token.message}
              </span>
            )}
          </label>
          {form.formState.errors.root?.server?.message && (
            <p role="alert" className="text-sm text-destructive">
              {form.formState.errors.root.server.message}
            </p>
          )}
          {done && (
            <p role="status" className="text-sm text-success">
              Приглашение принято.
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            disabled={mutation.pending}
            className="w-full"
          >
            {mutation.pending ? 'Принимаем…' : 'Принять приглашение'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
