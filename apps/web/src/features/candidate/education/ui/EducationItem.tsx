import { RecordItem, RecordItemActions } from '@/shared/ui';
import type { CandidateEducation } from '@/entities/candidate';

import { EDUCATION_LEVEL_LABELS } from '../model';

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
}: EducationItemProps) => (
  <RecordItem
    title={record.institution}
    subtitle={record.specialty || undefined}
    meta={
      <>
        {EDUCATION_LEVEL_LABELS[record.level]} · окончание{' '}
        <time dateTime={String(record.graduationYear)}>
          {record.graduationYear}
        </time>
      </>
    }
    actions={
      <RecordItemActions
        label={`образование: ${record.institution}`}
        disabled={disabled}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    }
  />
);
