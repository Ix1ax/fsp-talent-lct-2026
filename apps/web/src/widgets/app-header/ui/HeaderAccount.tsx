import Link from 'next/link';

import { APP_HEADER_ELEMENT_IDS, STATIC_ROUTES } from '@/shared/contants';
import { Button } from '@/shared/ui';
import type { SessionState } from '@/entities/session';
import { UserMenu } from '@/features/auth';

interface HeaderAccountProps {
  session: SessionState;
}

export const HeaderAccount = ({ session }: HeaderAccountProps) => {
  if (session.kind === 'user') {
    return (
      <UserMenu
        user={session.user}
        triggerId={APP_HEADER_ELEMENT_IDS.accountMenuTrigger}
      />
    );
  }

  if (session.kind === 'unavailable') {
    return (
      <div className="flex items-center gap-2">
        {session.displayName && (
          <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
            {session.displayName}
          </span>
        )}
        <span
          className="inline-flex h-6 items-center rounded-sm bg-warning-soft px-2 text-xs font-medium text-warning"
          role="status"
        >
          Сервис недоступен
        </span>
      </div>
    );
  }

  return (
    <Button asChild>
      <Link href={STATIC_ROUTES.LOGIN}>Войти</Link>
    </Button>
  );
};
