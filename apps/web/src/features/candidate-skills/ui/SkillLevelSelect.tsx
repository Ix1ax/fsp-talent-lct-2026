import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui';
import type { ClaimedLevel } from '@/entities/candidate';

import { SKILL_LEVELS } from '../constants';

interface SkillLevelSelectProps {
  value: ClaimedLevel;
  disabled?: boolean;
  label: string;
  onChange: (value: ClaimedLevel) => void;
}
export const SkillLevelSelect = ({
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
    <SelectTrigger aria-label={label}>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {SKILL_LEVELS.map((level) => (
        <SelectItem key={level} value={String(level)}>
          {level} из 5
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
