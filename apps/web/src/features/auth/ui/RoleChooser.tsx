'use client';

import { useState } from 'react';

import { ApiError } from '@/shared/api/errors';
import { takeLoginReturnPath } from '@/shared/auth/loginReturnPath';
import { useGuardedRouter } from '@/shared/hooks';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui';
import {
  getMeClient,
  getRoleHomeRoute,
  registerRole,
  type RegistrationRole,
  USER_ROLES,
} from '@/entities/session';

export const RoleChooser = () => {
  const router = useGuardedRouter();
  const [pending, setPending] = useState<RegistrationRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choose = async (role: RegistrationRole) => {
    setPending(role);
    setError(null);

    try {
      try {
        await registerRole(role);
      } catch (error) {
        if (!(error instanceof ApiError) || error.code !== 'already_registered')
          throw error;
        const user = await getMeClient();
        if (!user.role)
          throw new Error('Не удалось определить роль. Попробуйте снова.');
        router.push(takeLoginReturnPath(getRoleHomeRoute(user.role)));
        return;
      }
      router.push(takeLoginReturnPath(getRoleHomeRoute(role)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации');
      setPending(null);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Выберите роль</CardTitle>
        <CardDescription>
          Ваш аккаунт ещё не зарегистрирован в системе. Укажите, кем вы
          являетесь.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button
            disabled={pending !== null}
            onClick={() => void choose(USER_ROLES.CANDIDATE)}
          >
            {pending === USER_ROLES.CANDIDATE ? 'Сохранение…' : 'Я соискатель'}
          </Button>
          <Button
            variant="outline"
            disabled={pending !== null}
            onClick={() => void choose(USER_ROLES.EMPLOYER)}
          >
            {pending === USER_ROLES.EMPLOYER ? 'Сохранение…' : 'Я работодатель'}
          </Button>
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
