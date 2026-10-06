'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { STATIC_ROUTES } from '@/shared/contants';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui';
import { registerRole, type UserRole } from '@/entities/session';

export const RoleChooser = () => {
  const router = useRouter();
  const [pending, setPending] = useState<UserRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choose = async (role: UserRole) => {
    setPending(role);
    setError(null);

    try {
      await registerRole(role);
      router.push(STATIC_ROUTES.CABINET);
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
            onClick={() => void choose('candidate')}
          >
            {pending === 'candidate' ? 'Сохранение…' : 'Я соискатель'}
          </Button>
          <Button
            variant="outline"
            disabled={pending !== null}
            onClick={() => void choose('employer')}
          >
            {pending === 'employer' ? 'Сохранение…' : 'Я работодатель'}
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
