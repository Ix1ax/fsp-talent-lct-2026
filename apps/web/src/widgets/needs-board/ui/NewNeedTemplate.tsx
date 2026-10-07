import { PlusIcon } from 'lucide-react';

import { Button } from '@/shared/ui';

interface NewNeedTemplateProps {
  onClick: () => void;
  disabled?: boolean;
}

export const NewNeedTemplate = ({
  onClick,
  disabled,
}: NewNeedTemplateProps) => {
  return (
    <Button
      variant="ghost"
      size="default"
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-auto w-full justify-start rounded-none border-0 bg-transparent px-5 py-4 text-left whitespace-normal hover:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground flex-col items-start gap-2 border-b border-border"
    >
      <span className="flex items-center gap-2 font-mono text-[11px] text-brand-text">
        <span className="flex items-center gap-1 border border-dashed border-ring px-2 py-1">
          <PlusIcon className="size-3" />
          НОВАЯ
        </span>
      </span>
      <span className="text-base font-semibold text-brand-text">
        Создать потребность
      </span>
      <span className="text-sm text-muted-foreground">
        Опишите задачи, навыки и условия работы
      </span>
    </Button>
  );
};
