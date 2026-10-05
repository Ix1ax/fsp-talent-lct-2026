import Link from 'next/link';

import { ApiError } from '@/shared/api';
import { getAccessToken } from '@/shared/auth/session.server';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { getMe, type SessionUser } from '@/entities/session';

async function loadSession(): Promise<
  | { kind: 'guest' }
  | { kind: 'user'; user: SessionUser }
  | { kind: 'error'; message: string }
> {
  const token = await getAccessToken();
  if (!token) return { kind: 'guest' };

  try {
    const user = await getMe();
    return { kind: 'user', user };
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.code === 'unauthorized'
          ? 'Сессия недействительна'
          : error.message
        : 'Не удалось проверить сессию';
    return { kind: 'error', message };
  }
}

export async function SessionStatus() {
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
}
