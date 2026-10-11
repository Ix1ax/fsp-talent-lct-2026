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
}: ExperienceItemProps) => {
  return (
    <RecordItem>
      <RecordItem.Header>
        <RecordItem.Content>
          <RecordItem.Heading>
            <RecordItem.Title>{record.position}</RecordItem.Title>
          </RecordItem.Heading>
          <RecordItem.Subtitle>{record.company}</RecordItem.Subtitle>
          <RecordItem.Meta>
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
          </RecordItem.Meta>
        </RecordItem.Content>
        <RecordItem.Actions>
          <RecordItemActions
            label={`место работы: ${record.company}`}
            disabled={disabled}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </RecordItem.Actions>
      </RecordItem.Header>
      <RecordItem.Description>
        {record.description || undefined}
      </RecordItem.Description>
    </RecordItem>
  );
};
