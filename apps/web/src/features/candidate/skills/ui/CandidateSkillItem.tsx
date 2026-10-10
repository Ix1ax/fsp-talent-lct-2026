import { Trash2Icon } from 'lucide-react';

import { Badge, Button, RecordItem } from '@/shared/ui';
import type { CandidateSkill, ClaimedLevel } from '@/entities/candidate';

import { SkillLevelSelect } from './SkillLevelSelect';

interface CandidateSkillItemProps {
  skill: CandidateSkill;
  busy: boolean;
  onLevelChange: (level: ClaimedLevel) => void;
  onDelete: () => void;
}

const MODERATION_LABELS = {
  pending: 'На проверке',
  rejected: 'Не прошёл проверку',
  archived: 'Недоступен в справочнике',
  merged: 'Объединён в справочнике',
  approved: '',
};

export const CandidateSkillItem = ({
  skill,
  busy,
  onLevelChange,
  onDelete,
}: CandidateSkillItemProps) => (
  <RecordItem
    title={skill.name}
    badges={
      skill.moderationStatus !== 'approved' && (
        <Badge variant="outline" className="h-auto min-h-6 whitespace-normal">
          {MODERATION_LABELS[skill.moderationStatus]}
        </Badge>
      )
    }
    meta={
      skill.verifiedLevel != null
        ? `Подтверждённый уровень: ${skill.verifiedLevel} из 5`
        : 'Уровень пока не подтверждён. Можно пройти тестирование.'
    }
    actions={
      <>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Самооценка</span>
          <SkillLevelSelect
            value={skill.claimedLevel}
            label={`Самооценка: ${skill.name}`}
            disabled={
              busy || !['approved', 'pending'].includes(skill.moderationStatus)
            }
            onChange={onLevelChange}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
          disabled={busy}
          aria-label={`Удалить навык ${skill.name}`}
          onClick={onDelete}
        >
          <Trash2Icon aria-hidden="true" />
        </Button>
      </>
    }
  />
);
