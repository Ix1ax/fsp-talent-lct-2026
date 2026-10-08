import { Badge, Button } from '@/shared/ui';
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
  <li className="grid min-w-0 gap-4 border border-border p-4 sm:grid-cols-[minmax(0,1fr)_auto]">
    <div className="min-w-0 space-y-2 [overflow-wrap:anywhere]">
      <p className="text-base font-medium">{skill.name}</p>
      {skill.moderationStatus !== 'approved' && (
        <Badge variant="outline" className="h-auto min-h-6 whitespace-normal">
          {MODERATION_LABELS[skill.moderationStatus]}
        </Badge>
      )}
      <p className="text-sm text-muted-foreground">
        {skill.verifiedLevel != null
          ? `Подтверждённый уровень: ${skill.verifiedLevel} из 5`
          : 'Уровень пока не подтверждён. Можно пройти тестирование.'}
      </p>
    </div>
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
      <div className="flex flex-col gap-2">
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
        variant="outline"
        className="h-11"
        disabled={busy}
        aria-label={`Удалить навык ${skill.name}`}
        onClick={onDelete}
      >
        Удалить
      </Button>
    </div>
  </li>
);
