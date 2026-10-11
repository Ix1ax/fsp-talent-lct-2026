import { Button } from '@/shared/ui';

interface PaginationProps {
  offset: number;
  count: number;
  total?: number;
  onChange: (offset: number) => void;
  loading: boolean;
}
export const Pagination = ({
  offset,
  count,
  total,
  onChange,
  loading,
}: PaginationProps) => {
  return (
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm tabular-nums">
      <span className="text-muted-foreground">
        {count ? `${offset + 1}–${offset + count}` : 'Нет записей'}
        {total !== undefined && ` из ${total}`}
      </span>
      {(offset > 0 || count >= 20 || (total ?? 0) > 20) && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="h-11"
            disabled={loading || offset === 0}
            onClick={() => onChange(Math.max(0, offset - 20))}
          >
            Назад
          </Button>
          <Button
            variant="outline"
            className="h-11"
            disabled={
              loading ||
              (total === undefined ? count < 20 : offset + count >= total) ||
              offset >= 10000
            }
            onClick={() => onChange(offset + 20)}
          >
            Далее
          </Button>
        </div>
      )}
    </div>
  );
};
