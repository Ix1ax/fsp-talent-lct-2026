import Link from 'next/link';

import { requireAccessToken } from '@/shared/auth/server';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui';
import { loadSession } from '@/entities/session/api/server';
import { LogoutButton } from '@/features/auth';

export const CabinetPage = async () => {
  await requireAccessToken('/cabinet');
  const session = await loadSession();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Кабинет</CardTitle>
          <CardDescription>
            Защищённый экран: без access-токена выполняется попытка refresh,
            затем редирект на логин.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {session.kind === 'user' ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge>sub: {session.user.sub}</Badge>
                <Badge variant="secondary">{session.user.email}</Badge>
                <Badge
                  variant={session.user.emailVerified ? 'default' : 'outline'}
                >
                  {session.user.emailVerified
                    ? 'email verified'
                    : 'email unverified'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Идентичность получена из <code>/api/v1/me</code>. Локальная роль
                появится вместе с доменными модулями.
              </p>
            </div>
          ) : (
            <p className="text-sm text-destructive" role="alert">
              {session.kind === 'error'
                ? session.message
                : 'Не удалось загрузить профиль'}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/">На главную</Link>
          </Button>
          <LogoutButton />
        </CardFooter>
      </Card>
    </main>
  );
};
