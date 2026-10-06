import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui';
import { LoginButton } from '@/features/auth';

export const LoginPage = () => {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Вход</CardTitle>
          <CardDescription>
            Войдите через корпоративный аккаунт. Вы будете перенаправлены на
            страницу авторизации.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginButton />
        </CardContent>
      </Card>
    </main>
  );
};
