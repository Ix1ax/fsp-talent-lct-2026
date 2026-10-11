import { Badge } from '@/shared/ui';
import { statusLabels } from '@/entities/admin';

import { getAdminStatusClassName } from './OperationStatus';

interface StatusProps {
  value: string;
}

export const Status = ({ value }: StatusProps) => {
  return (
    <Badge
      variant="secondary"
      className={`h-auto min-h-6 max-w-full rounded-md px-2.5 whitespace-normal ${getAdminStatusClassName(value)}`}
    >
      {statusLabels[value] ?? value}
    </Badge>
  );
};
