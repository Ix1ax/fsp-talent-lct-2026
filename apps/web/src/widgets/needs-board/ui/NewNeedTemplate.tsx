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
      className="h-auto w-full justify-start rounded-none border-0 bg-transparent px-5 py-4 text-left text-brand-text whitespace-normal hover:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground flex-row items-center gap-2 border-b border-border"
    >
      <PlusIcon className="size-4 shrink-0" />
      <span>Создать потребность</span>
    </Button>
  );
};
