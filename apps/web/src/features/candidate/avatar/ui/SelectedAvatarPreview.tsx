import { useEffect, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui';

import { AvatarAction } from './AvatarAction';

interface SelectedAvatarPreviewProps {
  file: File;
  disabled: boolean;
  onAction: () => void;
}
export const SelectedAvatarPreview = ({
  file,
  disabled,
  onAction,
}: SelectedAvatarPreviewProps) => {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const frame = requestAnimationFrame(() => setUrl(url));
    return () => {
      cancelAnimationFrame(frame);
      URL.revokeObjectURL(url);
    };
  }, [file]);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <AvatarAction
        label="Редактировать выбранное фото"
        disabled={disabled}
        onClick={onAction}
      >
        <Avatar className="size-24">
          <AvatarImage src={url} alt="Выбранное фото" />
          <AvatarFallback>Фото</AvatarFallback>
        </Avatar>
      </AvatarAction>
      <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
        {file.name}
      </p>
    </div>
  );
};
