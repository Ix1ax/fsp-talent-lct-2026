import Link from 'next/link';

import { Button } from '@/shared/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/Card';

export function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Вход</CardTitle>
          <CardDescription>
            Авторизация через OIDC (Keycloak). Сам провайдер в бойлерплейте ещё не
            развёрнут — после настройки issuer сюда добавится Authorization Code +
            PKCE.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Пока доступны проверка API, refresh-контур и защищённый кабинет. Без
            валидных cookie access/refresh запрос в кабинет уведёт на эту страницу.
          </p>
          <p>
            Нужны переменные <code className="text-foreground">OIDC_TOKEN_URL</code>{' '}
            и <code className="text-foreground">OIDC_CLIENT_ID</code> для обновления
            токенов.
          </p>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/cabinet">Перейти в кабинет</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">На главную</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
