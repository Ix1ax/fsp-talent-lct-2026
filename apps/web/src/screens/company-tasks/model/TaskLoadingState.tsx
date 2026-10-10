import type { ReactNode } from 'react';

interface TaskLoadingStateProps {
  children: ReactNode;
  label: string;
}

export const TaskLoadingState = ({
  children,
  label,
}: TaskLoadingStateProps) => {
  return (
    <div role="status" aria-label={label} aria-busy="true">
      <span className="sr-only">{label}</span>
      <div
        aria-hidden="true"
        className="motion-reduce:[&_[data-slot=skeleton]]:animate-none"
      >
        {children}
      </div>
    </div>
  );
};
