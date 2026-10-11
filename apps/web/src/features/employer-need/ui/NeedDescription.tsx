import { type ReactNode } from 'react';
import { PencilIcon } from 'lucide-react';

import { Button, Textarea } from '@/shared/ui';
import { MetaLabel } from '@/shared/ui/MetaLabel';
import { type NeedInput } from '@/entities/employer-need';

interface NeedDescriptionProps {
  value: NeedInput;
  editing: boolean;
  readonly: boolean | undefined;
  setEditing: (editing: boolean) => void;
  change: (patch: Partial<NeedInput>) => void;
  errors: Record<string, string>;
  fieldError: (key: string) => ReactNode;
}
export const NeedDescription = ({
  value,
  editing,
  readonly,
  setEditing,
  change,
  errors,
  fieldError,
}: NeedDescriptionProps) => {
  return (
    <div className="grid gap-3 border-t border-border pt-4">
      <div className="flex items-center justify-between gap-3">
        <MetaLabel className="font-sans text-sm font-medium normal-case tracking-normal">
          Задачи{editing ? ' *' : ''}
        </MetaLabel>
        {!readonly && !editing && (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="min-h-11 text-brand-text"
            onClick={() => setEditing(true)}
          >
            <PencilIcon />
            Изменить потребность
          </Button>
        )}
      </div>
      {editing ? (
        <label className="grid gap-2">
          <span className="sr-only">Описание задач</span>
          <Textarea
            value={value.description}
            maxLength={10000}
            onChange={(e) => change({ description: e.target.value })}
            placeholder="Задачи на первые месяцы, команда, продукт"
            rows={4}
            aria-invalid={!!errors.description}
            aria-describedby={
              errors.description ? 'description-error' : undefined
            }
          />
          {fieldError('description')}
        </label>
      ) : (
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
          {value.description}
        </p>
      )}
    </div>
  );
};
