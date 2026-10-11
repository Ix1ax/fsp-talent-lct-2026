import { Badge } from '@/shared/ui';

import { operationStatusLabels } from '../constants';

const SUCCESS = [
  'verified',
  'active',
  'published',
  'approved',
  'accepted',
  'passed',
  'ready',
  'open',
];
const DANGER = ['blocked', 'hidden', 'failed', 'rejected'];

/** Тон бейджа как в кабинетах: мягкий фон без рамки. */
export const getAdminStatusClassName = (value: string) => {
  if (SUCCESS.includes(value)) return 'bg-success-soft text-success';
  if (DANGER.includes(value)) return 'bg-destructive/10 text-destructive';
  if (value === 'pending') return 'bg-accent text-brand-text';
  return 'bg-secondary text-muted-foreground';
};

interface OperationStatusProps {
  value: string;
  label?: string;
}
export const OperationStatus = ({ value, label }: OperationStatusProps) => {
  return (
    <Badge
      variant="secondary"
      className={`h-auto min-h-6 max-w-full rounded-md px-2.5 whitespace-normal ${getAdminStatusClassName(value)}`}
    >
      {label ?? operationStatusLabels[value] ?? value}
    </Badge>
  );
};
