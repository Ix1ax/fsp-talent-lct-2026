import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui';
import type { ClaimedLevel } from '@/entities/candidate';

import { SKILL_LEVELS } from '../model';

interface SkillLevelSelectProps {
  id?: string;
  value: ClaimedLevel;
  disabled?: boolean;
  label: string;
  onChange: (value: ClaimedLevel) => void;
}
export const SkillLevelSelect = ({
  id,
  value,
  disabled,
  label,
  onChange,
}: SkillLevelSelectProps) => (
  <Select
    value={String(value)}
    disabled={disabled}
    onValueChange={(next) => onChange(Number(next) as ClaimedLevel)}
  >
    <SelectTrigger id={id} aria-label={label} className="w-full min-w-28">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {SKILL_LEVELS.map((level) => (
        <SelectItem
          key={level}
          value={String(level)}
          className="min-h-11 text-base sm:text-sm"
        >
          {level} из 5
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
