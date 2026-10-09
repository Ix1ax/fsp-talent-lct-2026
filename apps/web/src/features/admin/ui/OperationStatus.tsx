import { operationStatusLabels } from '../constants';

interface OperationStatusProps {
  value: string;
}
export const OperationStatus = ({ value }: OperationStatusProps) => {
  let colors = 'border-border bg-muted text-muted-foreground';
  if (
    [
      'verified',
      'active',
      'published',
      'accepted',
      'passed',
      'ready',
      'open',
    ].includes(value)
  )
    colors = 'border-success/30 bg-success-soft text-success';
  if (['blocked', 'hidden', 'failed', 'rejected'].includes(value))
    colors = 'border-destructive/30 bg-destructive/10 text-destructive';
  if (value === 'pending')
    colors = 'border-primary/30 bg-accent text-brand-text';
  return (
    <span
      className={`inline-flex min-h-7 max-w-full shrink-0 items-center justify-center border px-2 py-1 text-center text-xs ${colors}`}
    >
      {operationStatusLabels[value] ?? value}
    </span>
  );
};
