'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/ui';

interface ServiceUnavailableNoticeProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ServiceUnavailableNotice = ({
  title = 'Сервис временно недоступен',
  message = 'Не удалось связаться с сервером. Попробуйте повторить попытку позже.',
  onRetry,
}: ServiceUnavailableNoticeProps) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <p className="text-sm text-muted-foreground" role="alert">
            {message}
          </p>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Button
              disabled={pending}
              onClick={handleRetry}
              className="min-h-11 w-full sm:w-auto"
            >
              {pending ? 'Обновление…' : 'Повторить загрузку'}
            </Button>
            <Button
              asChild
              variant="outline"
              className="min-h-11 w-full sm:w-auto"
            >
              <Link href="/">На главную</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
