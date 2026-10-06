import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';
import { Button } from '@/shared/ui';
import { loadSession } from '@/entities/session/api/server';
import { UserMenu } from '@/features/auth';

export const AppHeader = async () => {
  const session = await loadSession();

  return (
    <header className="border-b border-border/60">
      <div className="mx-auto flex max-w-285 items-center justify-between gap-4 px-8 py-4 max-md:px-5">
        <Link
          href={STATIC_ROUTES.HOME}
          className="bg-primary px-4.5 py-3 text-[22px] font-black text-primary-foreground"
        >
          ФСП
        </Link>

        <nav
          aria-label="Основная навигация"
          className="flex items-center gap-2"
        >
          <Button asChild variant="ghost" size="sm">
            <Link href={STATIC_ROUTES.GUIDES}>Гайды</Link>
          </Button>
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
  );
};
