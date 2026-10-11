import { Button } from '@/shared/ui';
import { AdminApiError } from '@/entities/admin';

interface ErrorNoticeProps {
  error: unknown;
  onRetry?: () => void;
}
export const ErrorNotice = ({ error, onRetry }: ErrorNoticeProps) => {
  if (!error) return null;
  const message =
    error instanceof Error ? error.message : 'Не удалось выполнить запрос';
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive wrap-anywhere"
    >
      {message}
      {onRetry && (
        <Button
          variant="outline"
          className="mt-3 min-h-11 w-fit bg-background text-foreground"
          onClick={onRetry}
        >
          Повторить загрузку
        </Button>
      )}
      {error instanceof AdminApiError && error.requestId && (
        <div className="mt-2 text-xs">Код запроса: {error.requestId}</div>
      )}
      {error instanceof AdminApiError && error.status === 429 && (
        <div className="mt-2">
          Повторите вход позже. Пауза: {error.retryAfter ?? '900'} секунд.
        </div>
      )}
    </div>
  );
};
