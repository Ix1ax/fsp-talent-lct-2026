import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';

import { AuthLayout, Button, Input } from '@/shared/ui';
import { AdminApiError } from '@/entities/admin';

import { loginFormSchema } from '../constants';
import { useAdminSession } from '../model';
import { ErrorNotice, Field } from './Common';

export const AdminLoginForm = () => {
  const { login } = useAdminSession();
  const [error, setError] = useState<unknown>(null);
  const [blocked, setBlocked] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });
  const submit = async ({
    email,
    password,
  }: z.infer<typeof loginFormSchema>) => {
    if (blocked) return;
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err);
      if (err instanceof AdminApiError && err.status === 429) {
        setBlocked(true);
        const seconds = Number(err.retryAfter ?? 900);
        timer.current = setTimeout(
          () => setBlocked(false),
          (Number.isFinite(seconds) && seconds > 0 ? seconds : 900) * 1000,
        );
      }
    }
  };
  return (
    <AuthLayout backLabel="На сайт">
      <div className="grid gap-6">
        <div className="grid gap-2">
          <h1 className="text-2xl font-semibold">Вход в админку</h1>
          <p className="text-sm text-muted-foreground">
            Используйте отдельный аккаунт администратора.
          </p>
        </div>
        {/* Ошибки полей появляются только при ошибке: промежутки между полями равные. */}
        <form
          onSubmit={(event) => void form.handleSubmit(submit)(event)}
          className="grid gap-4"
        >
          <Field
            label="Почта"
            error={form.formState.errors.email?.message}
            reserveErrorSpace={false}
          >
            <Input
              type="email"
              autoComplete="username"
              {...form.register('email')}
            />
          </Field>
          <Field
            label="Пароль"
            error={form.formState.errors.password?.message}
            reserveErrorSpace={false}
          >
            <Input
              type="password"
              autoComplete="current-password"
              {...form.register('password')}
            />
          </Field>
          <ErrorNotice error={error} />
          <Button
            className="mt-2 h-11"
            disabled={form.formState.isSubmitting || blocked}
          >
            {form.formState.isSubmitting ? 'Входим…' : 'Войти'}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
};
