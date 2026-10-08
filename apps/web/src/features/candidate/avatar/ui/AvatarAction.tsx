import type { ReactNode } from 'react';
import { CameraIcon } from 'lucide-react';

import { Button } from '@/shared/ui';

interface AvatarActionProps {
  children: ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}

export const AvatarAction = ({
  children,
  label,
  disabled,
  onClick,
}: AvatarActionProps) => (
  <Button
    type="button"
    variant="ghost"
    className="relative h-auto w-fit rounded-full p-0"
    disabled={disabled}
    aria-label={label}
    aria-describedby="avatar-help"
    onClick={onClick}
  >
    {children}
    <span className="absolute right-0 bottom-0 rounded-full border border-border bg-background p-1.5">
      <CameraIcon className="size-4" />
    </span>
  </Button>
);
