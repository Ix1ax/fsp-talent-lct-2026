import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';
import { Badge, Button } from '@/shared/ui';
import { getRoleHomeRoute } from '@/entities/session';
import { loadSession } from '@/entities/session/api/server';

export const SessionStatus = async () => {
  const session = await loadSession();

  if (session.kind === 'guest') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline">Гость</Badge>
        <Button asChild size="sm">
          <Link href={STATIC_ROUTES.LOGIN}>Войти</Link>
        </Button>
      </div>
    );
  }

  if (session.kind === 'error') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="destructive">{session.message}</Badge>
        <Button asChild size="sm" variant="outline">
          <Link href={STATIC_ROUTES.LOGIN}>Войти снова</Link>
        </Button>
      </div>
    );
  }

  const cabinetHref = session.user.role
    ? getRoleHomeRoute(session.user.role)
    : STATIC_ROUTES.CABINET;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Badge>{session.user.email}</Badge>
      {session.user.emailVerified ? (
        <Badge variant="secondary">email подтверждён</Badge>
      ) : (
        <Badge variant="outline">email не подтверждён</Badge>
      )}
      <Button asChild size="sm">
        <Link href={cabinetHref}>Кабинет</Link>
      </Button>
    </div>
  );
};
