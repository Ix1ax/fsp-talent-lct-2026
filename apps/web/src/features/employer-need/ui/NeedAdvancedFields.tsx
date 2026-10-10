import { Checkbox, Input } from '@/shared/ui';
import type { Skill } from '@/entities/catalog';
import type { NeedInput } from '@/entities/employer-need';
interface NeedAdvancedFieldsProps {
  value: NeedInput;
  skillsOnly?: boolean;
  skills: Skill[];
  errors: Record<string, string>;
  change: (patch: Partial<NeedInput>) => void;
}
export const NeedAdvancedFields = ({
  value,
  skillsOnly,
  skills,
  errors,
  change,
}: NeedAdvancedFieldsProps) => (
  <div className="grid gap-4 border-t border-border pt-4">
    {!skillsOnly && (
      <div className="grid gap-4 xl:grid-cols-2">
        <label className="grid gap-2 text-sm">
          Город
          <Input
            value={value.city ?? ''}
            maxLength={200}
            onChange={(e) => change({ city: e.target.value || null })}
            placeholder="Любой город"
            aria-invalid={!!errors.city}
          />
          {errors.city && (
            <p className="text-sm text-destructive">{errors.city}</p>
          )}
        </label>
        <label className="grid gap-2 text-sm">
          Часовой пояс
          <Input
            value={value.timezone ?? ''}
            onChange={(e) => change({ timezone: e.target.value || null })}
            placeholder="Europe/Moscow"
            aria-invalid={!!errors.timezone}
            aria-describedby={errors.timezone ? 'timezone-error' : undefined}
          />
          {errors.timezone && (
            <p id="timezone-error" className="text-sm text-destructive">
              {errors.timezone}
            </p>
          )}
        </label>
      </div>
    )}
    {value.skills.length > 0 && (
      <div className="grid gap-3">
        <p className="text-sm text-muted-foreground">
          Обязательность и приоритет навыков
        </p>
        {value.skills.map((skill) => (
          <div
            className="grid grid-cols-[1fr_100px] items-center gap-3"
            key={skill.skillId}
          >
            <label className="flex min-w-0 items-center gap-2 text-sm">
              <Checkbox
                aria-label={`Обязательный навык ${skills.find((s) => s.id === skill.skillId)?.name ?? 'из справочника'}`}
                checked={skill.required}
                onCheckedChange={(checked) =>
                  change({
                    skills: value.skills.map((v) =>
                      v.skillId === skill.skillId
                        ? { ...v, required: checked === true }
                        : v,
                    ),
                  })
                }
              />
              <span className="truncate">
                {skills.find((s) => s.id === skill.skillId)?.name ??
                  'Выбранный навык'}
              </span>
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Вес
              <Input
                aria-label={`Вес навыка ${skills.find((s) => s.id === skill.skillId)?.name ?? ''}`}
                type="number"
                min={0.01}
                max={100}
                step={0.01}
                value={skill.weight}
                onChange={(e) =>
                  change({
                    skills: value.skills.map((v) =>
                      v.skillId === skill.skillId
                        ? { ...v, weight: Number(e.target.value) }
                        : v,
                    ),
                  })
                }
              />
            </label>
          </div>
        ))}
      </div>
    )}
  </div>
);
