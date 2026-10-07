import { PlusIcon } from 'lucide-react';
export const NewNeedTemplate = ({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className="flex w-full flex-col gap-2 border-b border-border px-5 py-4 text-left hover:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground"
  >
    <span className="flex items-center gap-2 font-mono text-[11px] text-brand-text">
      <span className="flex items-center gap-1 border border-dashed border-ring px-2 py-1">
        <PlusIcon className="size-3" />
        НОВАЯ
      </span>
    </span>
    <span className="font-semibold text-brand-text">Новая потребность</span>
    <span className="text-[13px] leading-7 text-muted-foreground">
      Ищем специалиста{' '}
      <span className="border-b border-dashed border-input font-mono">
        специализация
      </span>{' '}
      уровня{' '}
      <span className="border-b border-dashed border-input font-mono">
        грейд
      </span>
      , формат — …
    </span>
  </button>
);
