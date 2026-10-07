import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';
import { Button } from '@/shared/ui';
import { BrandLogo } from '@/shared/ui/BrandLogo';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';
import { loadSession } from '@/entities/session/api/server';
import { UserMenu } from '@/features/auth';

import { SiteHeaderVisibility } from './SiteHeaderVisibility';

export const AppHeader = async () => {
  const session = await loadSession();

  return (
    <SiteHeaderVisibility>
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-285 items-center justify-between gap-4 px-8 py-4 max-md:px-5">
          <Link href={STATIC_ROUTES.HOME} className="flex items-center">
            <BrandLogo />
          </Link>

          <nav
            aria-label="Основная навигация"
            className="flex items-center gap-2"
          >
            <Button asChild variant="ghost" size="sm">
              <Link href={STATIC_ROUTES.GUIDES}>Гайды</Link>
            </Button>
            <ThemeToggle />
            {session.kind === 'user' ? (
              <UserMenu user={session.user} />
            ) : (
              <Button asChild size="sm">
                <Link href={STATIC_ROUTES.LOGIN}>Войти</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>
    </SiteHeaderVisibility>
  );
};
