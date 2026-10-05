import Link from 'next/link';

import { ApiError } from '@/shared/api';
import { requireAccessToken } from '@/shared/auth/server';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/Card';
import { getMe, type SessionUser } from '@/entities/session';
import { LogoutButton } from '@/features/auth';

async function loadSessionUser(): Promise<
  { user: SessionUser } | { error: string }
> {
  try {
    const user = await getMe();
    return { user };
  } catch (error) {
    const message =
      error instanceof ApiError
        ? `${error.code}: ${error.message}`
        : 'Не удалось загрузить профиль';
    return { error: message };
  }
}

export async function CabinetPage() {
  await requireAccessToken('/cabinet');
  const result = await loadSessionUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Кабинет</CardTitle>
          <CardDescription>
            Защищённый экран: без access-токена выполняется попытка refresh, затем
            редирект на логин.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {'user' in result ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge>sub: {result.user.sub}</Badge>
                <Badge variant="secondary">{result.user.email}</Badge>
                <Badge
                  variant={result.user.emailVerified ? 'default' : 'outline'}
                >
                  {result.user.emailVerified
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
              {result.error}
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
}
