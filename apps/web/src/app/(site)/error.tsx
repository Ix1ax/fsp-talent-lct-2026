'use client';

import { ServiceUnavailableNotice } from '@/shared/ui';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const SiteError = ({ error, reset }: ErrorProps) => {
  const isTimeout = /timeout/i.test(error.message);
  const title = isTimeout
    ? 'Превышено время ожидания'
    : 'Сервис временно недоступен';
  const message =
    error.message ||
    'Не удалось связаться с сервисом. Попробуйте повторить попытку позже.';

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <ServiceUnavailableNotice
        title={title}
        message={message}
        onRetry={reset}
      />
    </main>
  );
};

export default SiteError;
