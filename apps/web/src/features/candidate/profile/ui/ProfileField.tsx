import type { ReactNode } from 'react';

interface ProfileFieldProps {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}
export const ProfileField = ({
  id,
  label,
  error,
  children,
}: ProfileFieldProps) => (
  <div className="flex flex-col gap-2">
    <label htmlFor={id} className="text-sm font-medium">
      {label}
    </label>
    {children}
    {error && (
      <p id={`${id}-error`} className="text-sm text-destructive">
        {error}
      </p>
    )}
  </div>
);
