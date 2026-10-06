import { requireAccessToken } from '@/shared/auth/server';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui';
import { loadSession } from '@/entities/session/api/server';

export const CabinetPage = async () => {
  await requireAccessToken('/cabinet');
  const session = await loadSession();

  return (
    <main className="mx-auto flex max-w-2xl items-start p-6 pt-10">
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
      </Card>
    </main>
  );
};
