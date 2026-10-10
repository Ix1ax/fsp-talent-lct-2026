import { RecordItem, RecordItemActions } from '@/shared/ui';
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
  <RecordItem
    title={record.position}
    subtitle={record.company}
    meta={
      <>
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
      </>
    }
    actions={
      <RecordItemActions
        label={`место работы: ${record.company}`}
        disabled={disabled}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    }
  >
    {record.description || undefined}
  </RecordItem>
);
