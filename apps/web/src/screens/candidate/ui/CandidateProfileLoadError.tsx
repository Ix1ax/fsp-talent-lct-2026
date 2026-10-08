import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/ui';

interface CandidateProfileLoadErrorProps {
  error: string;
}

export const CandidateProfileLoadError = ({
  error,
}: CandidateProfileLoadErrorProps) => {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Профиль недоступен</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p role="alert">{error}</p>
        <Button
          disabled={refreshing}
          onClick={() => startTransition(() => router.refresh())}
          className="min-h-11 w-full whitespace-normal sm:w-auto sm:self-start"
        >
          Повторить загрузку
        </Button>
      </CardContent>
    </Card>
  );
};
