import { statusLabels } from '@/entities/admin';

interface StatusProps {
  value: string;
}

export const Status = ({ value }: StatusProps) => {
  return (
    <span
      className={`inline-flex min-h-7 max-w-full shrink-0 items-center justify-center whitespace-normal border px-2 py-1 text-center text-xs ${value === 'published' || value === 'approved' || value === 'active' ? 'border-success/30 bg-success-soft text-success' : 'border-border bg-muted text-muted-foreground'}`}
    >
      {statusLabels[value] ?? value}
    </span>
  );
};
