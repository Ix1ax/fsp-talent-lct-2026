import {
  ArchiveIcon,
  CopyIcon,
  MoreHorizontalIcon,
  Undo2Icon,
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
  onRestore,
  onArchive,
  onDuplicate,
}: NeedActionsProps) => (
  <div className="flex flex-wrap gap-3">
    {status === 'active' && (
      <Button
        type="button"
        onClick={onFind}
        disabled={pending || dirty}
        title={dirty ? 'Сохраните изменения перед поиском' : undefined}
      >
        Найти кандидатов →
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
            className="w-12 px-0"
            disabled={pending}
            aria-label="Ещё действия с потребностью"
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
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
