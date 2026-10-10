import type { ReactNode } from 'react';
import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';

import { BrandLogo } from './BrandLogo';
import { BrandPattern } from './BrandPattern';
import { PageWrapper } from './PageWrapper';
import { ThemeToggle } from './ThemeToggle';

interface AuthLayoutProps {
  children: ReactNode;
  /** Ссылка под карточкой: по умолчанию — на главную. */
  backHref?: string;
  backLabel?: string;
}

/**
 * Экран входа без шапки и подвала: логотип над карточкой,
 * переключатель темы в углу, фирменный фон.
 */
export const AuthLayout = ({
  children,
  backHref = STATIC_ROUTES.HOME,
  backLabel = 'На главную',
}: AuthLayoutProps) => {
  return (
    <div className="relative isolate flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <BrandPattern className="fixed -z-10" />
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <Link
          href={backHref}
          aria-label="ФСП Скаут — главная"
          className="flex min-h-11 items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring [&_img]:h-7!"
        >
          <BrandLogo />
        </Link>
        <PageWrapper variant="auth">{children}</PageWrapper>
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          ← {backLabel}
        </Link>
      </div>
    </div>
  );
};
