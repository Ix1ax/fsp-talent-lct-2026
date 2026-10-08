import { PencilIcon, Trash2Icon } from 'lucide-react';

import { Button } from '@/shared/ui';
import type { CandidateExperience } from '@/entities/candidate';

import { formatExperienceMonth } from '../lib';

interface ExperienceItemProps {
  record: CandidateExperience;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export const ExperienceItem = ({
  record,
  disabled,
  onEdit,
  onDelete,
}: ExperienceItemProps) => (
  <li className="flex min-w-0 flex-col gap-3 border-b border-border pb-5 last:border-0 last:pb-0">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1 [overflow-wrap:anywhere]">
        <h3 className="font-medium">{record.position}</h3>
        <p className="text-sm">{record.company}</p>
        <p className="text-sm text-muted-foreground">
          <time dateTime={record.startedOn}>
            {formatExperienceMonth(record.startedOn)}
          </time>
          {' — '}
          {record.endedOn === null ? (
            'по настоящее время'
          ) : (
            <time dateTime={record.endedOn}>
              {formatExperienceMonth(record.endedOn)}
            </time>
          )}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={disabled}
          onClick={onEdit}
          aria-label={`Редактировать место работы: ${record.company}`}
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
          aria-label={`Удалить место работы: ${record.company}`}
        >
          <Trash2Icon aria-hidden="true" />
        </Button>
      </div>
    </div>
    {record.description && (
      <p className="text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">
        {record.description}
      </p>
    )}
  </li>
);
