import { cn } from '@/shared/lib/utils';

interface FieldMessageProps {
  id?: string;
  message?: string;
  className?: string;
  role?: 'alert' | 'status';
  lines?: 1 | 2;
}

export const FieldMessage = ({
  id,
  message,
  className,
  role = 'alert',
  lines = 1,
}: FieldMessageProps) => {
  return (
    <p
      id={id}
      role={role}
      className={cn(
        'min-h-5 text-sm text-destructive',
        lines === 2 && 'min-h-10',
        className,
      )}
    >
      {message}
    </p>
  );
};
