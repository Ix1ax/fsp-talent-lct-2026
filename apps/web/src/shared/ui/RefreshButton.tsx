import { RefreshCwIcon } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

import { Button } from './Button';

interface RefreshButtonProps {
  label?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  onClick: () => void;
}

/** «Обновить»: на телефоне — только иконка, чтобы тулбар не переносился. */
export const RefreshButton = ({
  label = 'Обновить',
  loading = false,
  disabled,
  className,
  onClick,
}: RefreshButtonProps) => (
  <Button
    type="button"
    variant="outline"
    disabled={disabled}
    onClick={onClick}
    title={label}
    className={cn('shrink-0 max-sm:w-10 max-sm:px-0', className)}
  >
    <RefreshCwIcon
      aria-hidden="true"
      className={cn(loading && 'animate-spin motion-reduce:animate-none')}
    />
    <span className="max-sm:sr-only">{label}</span>
  </Button>
);
