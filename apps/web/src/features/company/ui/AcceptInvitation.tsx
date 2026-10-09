'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useAsyncMutation } from '@/shared/hooks';
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

import type { CompanyManagementApi } from '../model/management';

const tokenSchema = z.object({
  token: z.string().trim().min(1, 'Укажите токен приглашения'),
});
interface AcceptInvitationProps {
  api: CompanyManagementApi;
  onAccepted: (companyId: string) => Promise<void>;
  onBusyChange: (value: boolean) => void;
}
export const AcceptInvitation = ({
  api,
  onAccepted,
  onBusyChange,
}: AcceptInvitationProps) => {
  const mutation = useAsyncMutation();
  const form = useForm<{ token: string }>({
    resolver: zodResolver(tokenSchema),
    defaultValues: { token: '' },
  });
  const [done, setDone] = useState(false);
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (token) form.setValue('token', token);
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
            void mutation
              .run(async () => {
                const member = await api.acceptCompanyInvitation(token);
                setDone(true);
                form.reset({ token: '' });
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
              .catch(() => {});
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
          {mutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {mutation.error}
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
