import { CheckIcon, MinusIcon } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { MetaLabel } from '@/shared/ui/MetaLabel';
import { getMissingNeedFields, type NeedInput } from '@/entities/employer-need';

interface NeedReadinessProps {
  value: NeedInput;
}

export const NeedReadiness = ({ value }: NeedReadinessProps) => {
  const missing = getMissingNeedFields(value);
  return (
    <div
      className="grid gap-3 rounded-xl border border-border/60 bg-muted/60 p-4"
      aria-label="Готовность потребности к активации"
    >
      <MetaLabel>Чтобы начать поиск</MetaLabel>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[
          'название',
          'описание задач',
          'специализация',
          'навыки',
          'формат работы',
        ].map((label) => {
          const ready = !missing.includes(label);
          const Icon = ready ? CheckIcon : MinusIcon;
          return (
            <li key={label} className="flex items-center gap-2 text-sm">
              <span
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-md border border-input bg-card text-caption',
                  ready && 'border-success bg-success-soft text-success',
                )}
              >
                <Icon className="size-3" />
              </span>
              <span className="sr-only">
                {ready ? 'Заполнено:' : 'Не заполнено:'}
              </span>
              {label}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">
        Грейд и вилка — необязательны.
      </p>
    </div>
  );
};
