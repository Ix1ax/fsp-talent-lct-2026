import { CircleAlertIcon } from 'lucide-react';

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
      className="flex flex-col gap-3 rounded-xl bg-destructive/5 p-4 text-sm wrap-anywhere sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 gap-3">
        <CircleAlertIcon
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-destructive"
        />
        <div className="grid min-w-0 gap-1">
          <p className="text-foreground">{message}</p>
          {error instanceof AdminApiError && error.status === 429 && (
            <p className="text-muted-foreground">
              Повторите вход позже. Пауза: {error.retryAfter ?? '900'} секунд.
            </p>
          )}
          {error instanceof AdminApiError && error.requestId && (
            <p className="text-xs text-muted-foreground">
              Код запроса: {error.requestId}
            </p>
          )}
        </div>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          className="min-h-11 w-fit shrink-0 bg-background"
          onClick={onRetry}
        >
          Повторить загрузку
        </Button>
      )}
    </div>
  );
};
