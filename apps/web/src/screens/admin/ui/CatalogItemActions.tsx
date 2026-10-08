import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui';
import {
  type CatalogItem,
  type CatalogKind,
  queryString,
} from '@/entities/admin';

interface CatalogItemActionsProps {
  item: CatalogItem;
  kind: CatalogKind;
  busy: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

export const CatalogItemActions = ({
  item,
  kind,
  busy,
  onEdit,
  onToggle,
  onDelete,
}: CatalogItemActionsProps) => (
  <div className="flex items-center gap-2">
    <Button
      variant="outline"
      className="min-h-11"
      disabled={busy}
      onClick={onEdit}
    >
      Изменить
    </Button>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          disabled={busy}
          aria-label={`Действия с записью «${item.name}»`}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-w-[calc(100vw-2rem)] [&_[role=menuitem]]:min-h-11"
      >
        {kind === 'skills' && (
          <DropdownMenuItem asChild>
            <Link
              href={`/admin/moderation?${queryString({ skill_id: item.id })}`}
            >
              Открыть модерацию
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={onToggle}>
          {item.active === false ? 'Восстановить' : 'Архивировать'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          Удалить запись
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);
