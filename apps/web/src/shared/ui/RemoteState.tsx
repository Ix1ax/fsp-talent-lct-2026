import type { ReactNode } from 'react';

import { AsyncState } from './AsyncState';
import { Skeleton } from './Skeleton';

interface RemoteStateProps {
  loading: boolean;
  error?: string | null;
  retry?: () => void;
  retryDisabled?: boolean;
  loadingLabel?: string;
  loadingContent?: ReactNode;
  errorTitle?: string;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyContent?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/** Initial loading → error → empty result → content. Background refresh stays with the caller. */
export const RemoteState = ({
  loading,
  error,
  retry,
  retryDisabled,
  loadingLabel = 'Загрузка данных',
  loadingContent,
  errorTitle = 'Не удалось загрузить данные',
  empty = false,
  emptyTitle = 'Данных пока нет',
  emptyDescription,
  emptyContent,
  className,
  children,
}: RemoteStateProps) => {
  if (loading) {
    return (
      <div
        role="status"
        aria-label={loadingLabel}
        aria-busy="true"
        className={className}
      >
        <span className="sr-only">{loadingLabel}</span>
        <div
          aria-hidden="true"
          className="motion-reduce:[&_[data-slot=skeleton]]:animate-none"
        >
          {loadingContent ?? (
            <div className="grid gap-4">
              <Skeleton className="h-12 w-2/3" />
              <Skeleton className="h-48 w-full" />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <AsyncState
        error
        title={errorTitle}
        description={error}
        onRetry={retry}
        retryDisabled={retryDisabled}
        className={className}
      />
    );
  }

  if (empty) {
    return (
      emptyContent ?? (
        <AsyncState
          title={emptyTitle}
          description={emptyDescription}
          className={className}
        />
      )
    );
  }

  return children ?? null;
};
