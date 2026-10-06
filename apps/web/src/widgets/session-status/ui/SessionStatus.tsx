import Link from 'next/link';

import { Badge, Button } from '@/shared/ui';
import { loadSession } from '@/entities/session/api/server';

export const SessionStatus = async () => {
  const session = await loadSession();

  if (session.kind === 'guest') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline">Гость</Badge>
        <Button asChild size="sm">
          <Link href="/login">Войти</Link>
        </Button>
        <Button asChild size="sm" variant="secondary">
          <Link href="/cabinet">Кабинет</Link>
        </Button>
      </div>
    );
  }

  if (session.kind === 'error') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="destructive">{session.message}</Badge>
        <Button asChild size="sm" variant="outline">
          <Link href="/login">Войти снова</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Badge>{session.user.email}</Badge>
      {session.user.emailVerified ? (
        <Badge variant="secondary">email подтверждён</Badge>
      ) : (
        <Badge variant="outline">email не подтверждён</Badge>
      )}
      <Button asChild size="sm">
        <Link href="/cabinet">Кабинет</Link>
      </Button>
    </div>
  );
};
