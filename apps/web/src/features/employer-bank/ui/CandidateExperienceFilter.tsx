import { Input } from '@/shared/ui';

interface CandidateExperienceFilterProps {
  experienceMin: string;
  experienceMax: string;
  onExperienceMin: (value: string) => void;
  onExperienceMax: (value: string) => void;
}
export const CandidateExperienceFilter = ({
  experienceMin,
  experienceMax,
  onExperienceMin,
  onExperienceMax,
}: CandidateExperienceFilterProps) => {
  return (
    <div className="grid gap-3 border-t pt-5">
      <h3 className="text-sm font-medium text-muted-foreground">Опыт, лет</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-2 text-xs text-muted-foreground">
          От
          <Input
            aria-label="Опыт от, лет"
            type="number"
            min={0}
            max={50}
            step={0.1}
            value={experienceMin}
            onChange={(event) => onExperienceMin(event.target.value)}
          />
        </label>
        <label className="grid gap-2 text-xs text-muted-foreground">
          До
          <Input
            aria-label="Опыт до, лет"
            type="number"
            min={0}
            max={50}
            step={0.1}
            value={experienceMax}
            onChange={(event) => onExperienceMax(event.target.value)}
          />
        </label>
      </div>
    </div>
  );
};
