import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';
import { BrandLogo, Button, ThemeToggle } from '@/shared/ui';
import { loadSession } from '@/entities/session/api/server';
import { UserMenu } from '@/features/auth';

export const AppHeader = async () => {
  const session = await loadSession();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex max-w-285 items-center justify-between gap-4 px-5 py-4 max-md:px-5">
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
          ) : session.kind === 'unavailable' ? (
            <div className="flex items-center gap-2">
              {session.displayName && (
                <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
                  {session.displayName}
                </span>
              )}
              <span
                className="inline-flex items-center rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400"
                role="status"
              >
                Сервис недоступен
              </span>
            </div>
          ) : (
            <Button asChild className="min-h-11 px-3 sm:px-4">
              <Link href={STATIC_ROUTES.LOGIN}>Войти</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
};
