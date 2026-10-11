import {
  Children,
  cloneElement,
  isValidElement,
  type ReactNode,
  useId,
} from 'react';

import { Input, Textarea } from '@/shared/ui';

interface FieldProps {
  label: string;
  children: ReactNode;
  error?: string;
  reserveErrorSpace?: boolean;
}
export const Field = ({
  label,
  children,
  error,
  reserveErrorSpace = true,
}: FieldProps) => {
  const id = useId();
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;
  const controls = Children.map(children, (child) => {
    if (
      !isValidElement<{
        'aria-describedby'?: string;
        'aria-labelledby'?: string;
        'aria-invalid'?: boolean;
      }>(child) ||
      (child.type !== Input && child.type !== Textarea)
    )
      return child;
    return cloneElement(child, {
      'aria-labelledby': labelId,
      'aria-invalid': child.props['aria-invalid'] ?? !!error,
      'aria-describedby':
        [child.props['aria-describedby'], error ? errorId : undefined]
          .filter(Boolean)
          .join(' ') || undefined,
    });
  });
  return (
    <label
      data-admin-field
      className="grid min-w-0 content-start gap-1.5 text-sm [&_input]:h-11 [&_input]:text-base [&_textarea]:text-base sm:[&_input]:text-sm sm:[&_textarea]:text-sm"
    >
      <span id={labelId} className="min-h-5 font-medium leading-5">
        {label}
      </span>
      {controls}
      {(reserveErrorSpace || error) && (
        <span
          id={errorId}
          role={error ? 'alert' : undefined}
          className="min-h-4 text-xs text-destructive"
        >
          {error}
        </span>
      )}
    </label>
  );
};
