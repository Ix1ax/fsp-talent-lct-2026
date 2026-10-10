import type { ReactNode } from 'react';
import { CameraIcon, PencilIcon, Trash2Icon } from 'lucide-react';

import { CANDIDATE_ELEMENT_IDS } from '@/shared/contants';
import { Button } from '@/shared/ui';

interface AvatarActionProps {
  children: ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
  onReplace?: () => void;
  onRemove?: () => void;
}

export const AvatarAction = ({
  children,
  label,
  disabled,
  onClick,
  onReplace,
  onRemove,
}: AvatarActionProps) => {
  return (
    <div className="group/avatar relative size-36 shrink-0 overflow-hidden rounded-full">
      {children}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full bg-black/60 opacity-0 transition-opacity group-hover/avatar:opacity-100 group-focus-within/avatar:opacity-100 [@media(hover:none)]:opacity-100 motion-reduce:transition-none">
        <div
          className={
            onReplace
              ? 'flex items-center gap-1'
              : 'flex size-full items-center justify-center'
          }
        >
          <Button
            type="button"
            variant="ghost"
            className={`${onReplace ? 'size-11' : 'size-full'} rounded-full p-0 text-white hover:bg-white/20 hover:text-white focus-visible:ring-white`}
            disabled={disabled}
            aria-label={label}
            aria-describedby={CANDIDATE_ELEMENT_IDS.avatar.hint}
            title={label}
            onClick={onClick}
          >
            {onReplace ? (
              <PencilIcon className="size-5" />
            ) : (
              <CameraIcon className="size-5" />
            )}
          </Button>
          {onReplace && (
            <Button
              type="button"
              variant="ghost"
              className="size-11 rounded-full p-0 text-white hover:bg-white/20 hover:text-white focus-visible:ring-white"
              disabled={disabled}
              aria-label="Загрузить другое фото"
              title="Загрузить другое фото"
              onClick={onReplace}
            >
              <CameraIcon className="size-5" />
            </Button>
          )}
        </div>
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            className="size-11 rounded-full p-0 text-white hover:bg-white/20 hover:text-white focus-visible:ring-white"
            disabled={disabled}
            aria-label="Удалить фото"
            title="Удалить фото"
            onClick={onRemove}
          >
            <Trash2Icon className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
