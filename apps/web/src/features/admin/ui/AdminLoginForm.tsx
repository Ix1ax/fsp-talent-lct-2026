import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';

import { BrandLogo, Button, FadeIn, Input, ThemeToggle } from '@/shared/ui';
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
    <div className="flex min-h-screen items-center justify-center p-5">
      <FadeIn className="w-full max-w-md rounded-xl border bg-card p-5 sm:p-8">
        <div className="mb-10 flex items-center justify-between">
          <BrandLogo />
          <ThemeToggle />
        </div>
        <div className="mb-6">
          <p className="mb-2 text-xs uppercase tracking-widest text-brand-text">
            Управление платформой
          </p>
          <h1 className="text-2xl font-semibold sm:text-3xl">Вход в админку</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Используйте отдельный аккаунт администратора.
          </p>
        </div>
        <form
          onSubmit={(event) => void form.handleSubmit(submit)(event)}
          className="grid gap-5"
        >
          <Field label="Почта" error={form.formState.errors.email?.message}>
            <Input
              type="email"
              autoComplete="username"
              {...form.register('email')}
            />
          </Field>
          <Field label="Пароль" error={form.formState.errors.password?.message}>
            <Input
              type="password"
              autoComplete="current-password"
              {...form.register('password')}
            />
          </Field>
          <ErrorNotice error={error} />
          <Button
            className="min-h-11"
            disabled={form.formState.isSubmitting || blocked}
          >
            {form.formState.isSubmitting ? 'Входим…' : 'Войти'}
          </Button>
        </form>
        <Link
          href="/"
          className="mt-6 flex min-h-11 items-center text-sm text-muted-foreground"
        >
          ← На сайт
        </Link>
      </FadeIn>
    </div>
  );
};
