import Link from 'next/link';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui';
import { BrandLogo } from '@/shared/ui/BrandLogo';
import { LoginButton } from '@/features/auth';

export const LoginPage = () => {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-6 px-5 py-10 sm:px-6">
      <Link href="/" className="self-start" aria-label="ФСП Скаут — на главную">
        <BrandLogo />
      </Link>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Войти в ФСП Скаут</CardTitle>
          <CardDescription>
            Продолжите через аккаунт ФСП, чтобы заполнить профиль или подобрать
            специалистов для команды.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <LoginButton />
          <p className="text-sm text-muted-foreground">
            Откроется защищённая страница входа ФСП.
          </p>
        </CardContent>
      </Card>
      <Link
        href="/"
        className="self-start text-sm text-muted-foreground underline underline-offset-4"
      >
        Вернуться на главную
      </Link>
    </main>
  );
};
