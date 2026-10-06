import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';
import { Button } from '@/shared/ui';
import { loadSession } from '@/entities/session/api/server';
import { UserMenu } from '@/features/auth';

export const AppHeader = async () => {
  const session = await loadSession();

  return (
    <header className="border-b border-border/60">
      <div className="mx-auto flex max-w-[1140px] items-center justify-between gap-4 px-8 py-4 max-md:px-5">
        <Link
          href={STATIC_ROUTES.HOME}
          className="bg-primary px-[18px] py-3 text-[22px] font-black text-primary-foreground"
        >
          ФСП
        </Link>

        {session.kind === 'user' ? (
          <UserMenu user={session.user} />
        ) : (
          <Button asChild size="sm">
            <Link href={STATIC_ROUTES.LOGIN}>Войти</Link>
          </Button>
        )}
      </div>
    </header>
  );
};
