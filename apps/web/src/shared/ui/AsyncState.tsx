import { cn } from '@/shared/lib/utils';

import { Button } from './Button';
interface AsyncStateProps {
  title: string;
  description?: string;
  onRetry?: () => void;
  error?: boolean;
  className?: string;
}
export const AsyncState = ({
  title,
  description,
  onRetry,
  error,
  className,
}: AsyncStateProps) => (
  <div
    role={error ? 'alert' : 'status'}
    className={cn(
      'flex min-h-48 flex-col items-center justify-center gap-2 border border-dashed border-input p-6 text-center',
      className,
    )}
  >
    <h2 className="text-lg font-semibold">{title}</h2>
    {description && (
      <p
        className={
          error
            ? 'max-w-md text-sm text-destructive'
            : 'max-w-md text-sm text-muted-foreground'
        }
      >
        {description}
      </p>
    )}
    {onRetry && (
      <Button variant="outline" onClick={onRetry}>
        Повторить
      </Button>
    )}
  </div>
);
