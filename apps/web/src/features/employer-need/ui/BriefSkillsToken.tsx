import { BriefToken, Button, Checkbox, Input } from '@/shared/ui';
import { type Skill } from '@/entities/catalog';
import { type NeedInput } from '@/entities/employer-need';

import { MAX_NEED_SKILLS } from '../constants';

interface BriefSkillsTokenProps {
  required: boolean;
  value: NeedInput;
  skills: Skill[];
  searchItems: Skill[];
  skillQuery: string;
  onSkillQuery: (query: string) => void;
  skillsLoading: boolean;
  skillsError: string;
  onRetrySkills: () => void;
  disabled: boolean | undefined;
  change: (patch: Partial<NeedInput>) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
export const BriefSkillsToken = ({
  required,
  value,
  skills,
  searchItems,
  skillQuery,
  onSkillQuery,
  skillsLoading,
  skillsError,
  onRetrySkills,
  disabled,
  change,
  open,
  onOpenChange,
}: BriefSkillsTokenProps) => {
  const selected = skills.filter((s) =>
    value.skills.some((v) => v.skillId === s.id && v.required === required),
  );

  return (
    <BriefToken
      open={open}
      onOpenChange={onOpenChange}
      disabled={disabled}
      title={required ? 'Обязательные навыки' : 'Желательные навыки'}
      empty={!selected.length}
      label={selected.map((s) => s.name).join(', ') || '+ навык'}
    >
      {selected.map((skill) => (
        <Button
          key={skill.id}
          type="button"
          variant="outline"
          className="mb-2 min-h-11 w-full whitespace-normal"
          onClick={() =>
            change({
              skills: value.skills.filter((item) => item.skillId !== skill.id),
            })
          }
        >
          Убрать {skill.name}
        </Button>
      ))}
      <Input
        aria-label="Поиск навыка"
        placeholder="Поиск по справочнику"
        maxLength={100}
        value={skillQuery}
        onChange={(e) => onSkillQuery(e.target.value)}
      />
      {skillsLoading && (
        <p role="status" className="text-sm">
          Ищем навыки…
        </p>
      )}
      {skillsError && (
        <div role="alert" className="grid gap-2 text-sm">
          <p>{skillsError}</p>
          <Button type="button" variant="outline" onClick={onRetrySkills}>
            Повторить поиск навыков
          </Button>
        </div>
      )}
      {!skillsLoading && !skillsError && !searchItems.length && (
        <p className="text-sm">Навыков не найдено. Уточните поиск.</p>
      )}
      <div className="grid max-h-64 gap-3 overflow-auto">
        {searchItems.map((s) => (
          <label
            key={s.id}
            className="flex min-h-11 items-center gap-3 text-base"
          >
            <Checkbox
              disabled={
                disabled ||
                (value.skills.length >= MAX_NEED_SKILLS &&
                  !value.skills.some((skill) => skill.skillId === s.id))
              }
              checked={value.skills.some(
                (v) => v.skillId === s.id && v.required === required,
              )}
              onCheckedChange={(checked) => {
                const previous = value.skills.find((v) => v.skillId === s.id);
                if (
                  checked &&
                  !previous &&
                  value.skills.length >= MAX_NEED_SKILLS
                )
                  return;
                change({
                  skills: checked
                    ? [
                        ...value.skills.filter((v) => v.skillId !== s.id),
                        {
                          skillId: s.id,
                          required,
                          weight: previous?.weight ?? 1,
                        },
                      ]
                    : value.skills.filter((v) => v.skillId !== s.id),
                });
              }}
            />
            {s.name}
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Показано до 50 результатов. Уточните поиск для других навыков. Выбрано{' '}
        {value.skills.length} из {MAX_NEED_SKILLS} навыков. Лимит общий для
        обязательных и желательных.
      </p>
    </BriefToken>
  );
};
