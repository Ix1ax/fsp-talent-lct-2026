import { PencilIcon, Trash2Icon } from 'lucide-react';

import { Button } from '@/shared/ui';
import type { CandidateEducation } from '@/entities/candidate';

import { EDUCATION_LEVEL_LABELS } from '../constants';

interface EducationItemProps {
  record: CandidateEducation;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export const EducationItem = ({
  record,
  disabled,
  onEdit,
  onDelete,
}: EducationItemProps) => {
  return (
    <li className="flex min-w-0 flex-col gap-3 border-b border-border pb-5 last:border-0 last:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1 [overflow-wrap:anywhere]">
          <h3 className="font-medium">{record.institution}</h3>
          <p className="text-sm text-muted-foreground">
            {EDUCATION_LEVEL_LABELS[record.level]} ·{' '}
            <time dateTime={String(record.graduationYear)}>
              {record.graduationYear}
            </time>
          </p>
          {record.specialty && (
            <p className="text-sm whitespace-pre-wrap">{record.specialty}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={disabled}
            onClick={onEdit}
            aria-label={`Редактировать образование: ${record.institution}`}
          >
            <PencilIcon aria-hidden="true" />
            Редактировать
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11"
            disabled={disabled}
            onClick={onDelete}
            aria-label={`Удалить образование: ${record.institution}`}
          >
            <Trash2Icon aria-hidden="true" />
          </Button>
        </div>
      </div>
    </li>
  );
};
