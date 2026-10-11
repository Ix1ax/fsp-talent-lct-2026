import {
  ArchiveIcon,
  CopyIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Undo2Icon,
  UsersIcon,
} from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui';
import type { NeedStatus } from '@/entities/employer-need';
interface NeedActionsProps {
  status: NeedStatus;
  canWrite: boolean;
  pending: boolean;
  dirty: boolean;
  onFind: () => void;
  /** Перейти к брифу: дополнить черновик или изменить условия активной. */
  onEditBrief?: () => void;
  onRestore: () => void;
  onArchive: () => void;
  onDuplicate: () => void;
}
export const NeedActions = ({
  status,
  canWrite,
  pending,
  dirty,
  onFind,
  onEditBrief,
  onRestore,
  onArchive,
  onDuplicate,
}: NeedActionsProps) => {
  return (
    <div className="flex flex-wrap gap-3">
      {status === 'active' && (
        <Button
          type="button"
          onClick={onFind}
          disabled={pending || dirty}
          title={dirty ? 'Сохраните изменения перед поиском' : undefined}
        >
          <UsersIcon />
          Подобрать кандидатов
        </Button>
      )}
      {canWrite && status === 'active' && onEditBrief && (
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={onEditBrief}
        >
          <PencilIcon />
          Изменить условия
        </Button>
      )}
      {canWrite && status === 'draft' && onEditBrief && (
        <Button type="button" disabled={pending} onClick={onEditBrief}>
          <PencilIcon />
          Дополнить бриф
        </Button>
      )}
      {canWrite && status === 'archived' && (
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={onRestore}
        >
          <Undo2Icon />
          Вернуть в черновики
        </Button>
      )}
      {canWrite && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="w-10 px-0"
              disabled={pending}
              aria-label="Ещё действия с потребностью"
            >
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onDuplicate}>
              <CopyIcon />
              Копия в черновики
            </DropdownMenuItem>
            {status !== 'archived' && (
              <DropdownMenuItem onSelect={onArchive}>
                <ArchiveIcon />В архив
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};
