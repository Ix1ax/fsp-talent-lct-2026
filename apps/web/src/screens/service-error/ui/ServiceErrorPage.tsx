import { PageWrapper, ServiceUnavailableNotice } from '@/shared/ui';

interface ServiceErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
  fullViewport?: boolean;
  fallbackMessage?: string;
}

export const ServiceErrorPage = ({
  error,
  reset,
  fullViewport = false,
  fallbackMessage = 'Не удалось связаться с сервисом. Попробуйте повторить попытку позже.',
}: ServiceErrorPageProps) => {
  return (
    <PageWrapper
      className={
        fullViewport
          ? 'min-h-dvh items-center justify-center'
          : 'items-center justify-center'
      }
    >
      <ServiceUnavailableNotice
        title={
          /timeout/i.test(error.message)
            ? 'Превышено время ожидания'
            : 'Сервис временно недоступен'
        }
        message={error.message || fallbackMessage}
        onRetry={reset}
      />
    </PageWrapper>
  );
};
