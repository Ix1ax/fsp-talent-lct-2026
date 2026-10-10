import Link from 'next/link';
import { LockIcon } from 'lucide-react';

import { DYNAMIC_ROUTES } from '@/shared/contants';
import { LoginButton } from '@/features/auth';

export const LoginPanel = () => {
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold">Войдите в ФСП Скаут</h1>
        <p className="text-[0.9375rem] leading-relaxed text-muted-foreground">
          Через аккаунт ФСП — чтобы заполнить профиль или подобрать специалистов
          для команды.
        </p>
      </div>
      <div className="grid gap-3">
        <LoginButton className="h-11 w-full" />
        <p className="flex items-start gap-2 text-sm text-caption">
          <LockIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          Откроется защищённая страница входа ФСП.
        </p>
      </div>
      <p className="border-t border-border pt-5 text-[0.8125rem] leading-relaxed text-muted-foreground">
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
        . Согласие на обработку данных профиля даётся отдельно, в кабинете.
      </p>
    </div>
  );
};
