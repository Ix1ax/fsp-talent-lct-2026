import { Button } from '../Button';

interface PageControlsProps {
  offset: number;
  count: number;
  limit?: number;
  total?: number;
  pending?: boolean;
  onPage: (offset: number) => void;
}
export const PageControls = ({
  offset,
  count,
  limit = 20,
  total,
  pending,
  onPage,
}: PageControlsProps) => {
  const hasMore =
    total === undefined ? count === limit : offset + limit < total;
  if (!offset && !hasMore) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
      <Button
        type="button"
        variant="outline"
        disabled={!offset || pending}
        onClick={() => onPage(Math.max(0, offset - limit))}
      >
        Назад
      </Button>
      <span className="text-sm text-muted-foreground">
        Страница {Math.floor(offset / limit) + 1}
        {total !== undefined && ` · найдено ${total}`}
      </span>
      <Button
        type="button"
        variant="outline"
        disabled={!hasMore || pending || offset + limit > 10000}
        onClick={() => onPage(offset + limit)}
      >
        Далее
      </Button>
    </div>
  );
};
