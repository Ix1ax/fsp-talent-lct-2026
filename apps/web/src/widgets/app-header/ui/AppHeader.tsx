import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';
import { BrandLogo, Button, ThemeToggle } from '@/shared/ui';
import { loadSession } from '@/entities/session/api/server';
import { UserMenu } from '@/features/auth';

import { SiteHeaderVisibility } from './SiteHeaderVisibility';

export const AppHeader = async () => {
  const session = await loadSession();

  return (
    <SiteHeaderVisibility>
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-285 items-center justify-between gap-4 px-8 py-4 max-md:px-5">
          <Link
            href={STATIC_ROUTES.HOME}
            className="flex min-h-11 shrink-0 items-center"
            aria-label="ФСП Скаут — главная"
          >
            <span className="sm:hidden">
              <BrandLogo compact />
            </span>
            <span className="hidden sm:inline-flex">
              <BrandLogo />
            </span>
          </Link>

          <nav
            aria-label="Основная навигация"
            className="flex items-center gap-2"
          >
            <Button asChild variant="ghost" className="min-h-11 px-2 sm:px-4">
              <Link href={STATIC_ROUTES.GUIDES}>Справочник</Link>
            </Button>
            <ThemeToggle />
            {session.kind === 'user' ? (
              <UserMenu user={session.user} />
            ) : (
              <Button asChild className="min-h-11 px-3 sm:px-4">
                <Link href={STATIC_ROUTES.LOGIN}>Войти</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>
    </SiteHeaderVisibility>
  );
};
