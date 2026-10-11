import type { ReactNode } from 'react';

import { FieldMessage } from '@/shared/ui';

interface ProfileFieldProps {
  id: string;
  errorId: string;
  label: string;
  error?: string;
  errorLines?: 1 | 2;
  children: ReactNode;
}
export const ProfileField = ({
  id,
  errorId,
  label,
  error,
  errorLines = 1,
  children,
}: ProfileFieldProps) => {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      <FieldMessage id={errorId} message={error} lines={errorLines} />
    </div>
  );
};
