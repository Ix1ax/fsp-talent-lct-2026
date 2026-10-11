import type { ReactNode } from 'react';

import { RemoteState } from '@/shared/ui';

interface TaskLoadingStateProps {
  children: ReactNode;
  label: string;
}

export const TaskLoadingState = ({
  children,
  label,
}: TaskLoadingStateProps) => {
  return <RemoteState loading loadingLabel={label} loadingContent={children} />;
};
