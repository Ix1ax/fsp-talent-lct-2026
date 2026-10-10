import Link from 'next/link';
import { LockIcon } from 'lucide-react';

import { DYNAMIC_ROUTES, STATIC_ROUTES } from '@/shared/contants';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui';
import { LoginButton } from '@/features/auth';

export const LoginPage = () => {
  return (
    <main className="container-page flex flex-1 items-center justify-center py-12 md:py-24">
      <div className="flex w-full max-w-110 flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>
              <h1 className="text-2xl font-semibold">Войдите в ФСП Скаут</h1>
            </CardTitle>
            <CardDescription className="text-[0.9375rem] leading-relaxed">
              Через аккаунт ФСП — чтобы заполнить профиль или подобрать
              специалистов для команды.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <LoginButton />
            <p className="flex items-start gap-2 text-sm text-caption">
              <LockIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
              Откроется защищённая страница входа ФСП.
            </p>
            <p className="border-t border-border pt-4 text-[0.8125rem] leading-relaxed text-muted-foreground">
              Продолжая, вы принимаете{' '}
              <Link
                href={DYNAMIC_ROUTES.LEGAL('terms')}
                className="text-brand-text underline underline-offset-4"
              >
                пользовательское соглашение
              </Link>{' '}
              и подтверждаете, что ознакомились с{' '}
              <Link
                href={DYNAMIC_ROUTES.LEGAL('privacy')}
                className="text-brand-text underline underline-offset-4"
              >
                политикой обработки персональных данных
              </Link>
              . Согласие на обработку данных профиля даётся отдельно, в
              кабинете.
            </p>
          </CardContent>
        </Card>
        <Link
          href={STATIC_ROUTES.HOME}
          className="self-start text-sm text-brand-text underline-offset-4 hover:underline"
        >
          ← На главную
        </Link>
      </div>
    </main>
  );
};
