'use client';
import { useState } from 'react';

import { formatSalaryRange } from '@/shared/lib/formatSalaryRange';
import { Button, Checkbox, Input } from '@/shared/ui';
import { BriefToken } from '@/shared/ui/BriefToken';
import { SalaryRangeInput } from '@/shared/ui/SalaryRangeInput';
import type { Catalogs, Skill } from '@/entities/catalog';
import type { NeedInput } from '@/entities/employer-need';
interface BriefPhraseProps {
  value: NeedInput;
  onChange: (value: NeedInput) => void;
  catalogs: Catalogs;
  skills: Skill[];
  disabled?: boolean;
  errors: Record<string, string>;
}
export const BriefPhrase = ({
  value,
  onChange,
  catalogs,
  skills,
  disabled,
  errors,
}: BriefPhraseProps) => {
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const change = (patch: Partial<NeedInput>) =>
    onChange({ ...value, ...patch });
  const token = (key: string) => ({
    open: open === key,
    onOpenChange: (v: boolean) => setOpen(v ? key : null),
    disabled,
  });
  const option = (
    id: number | null,
    label: string,
    pick: () => void,
    selected: boolean,
  ) => (
    <Button
      type="button"
      variant={selected ? 'secondary' : 'ghost'}
      key={id ?? 'none'}
      className="w-full justify-start"
      onClick={() => {
        pick();
        setOpen(null);
      }}
    >
      {label}
      {selected ? ' ✓' : ''}
    </Button>
  );
  const skillToken = (required: boolean) => {
    const selected = skills.filter((s) =>
      value.skills.some((v) => v.skillId === s.id && v.required === required),
    );
    return (
      <BriefToken
        {...token(required ? 'requiredSkills' : 'optionalSkills')}
        title={required ? 'Обязательные навыки' : 'Желательные навыки'}
        empty={!selected.length}
        label={selected.map((s) => s.name).join(', ') || 'добавить навыки'}
      >
        <Input
          aria-label="Поиск навыка"
          placeholder="Поиск по справочнику"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="mt-3 grid max-h-64 gap-3 overflow-auto">
          {skills
            .filter((s) =>
              [s.name, ...s.aliases]
                .join(' ')
                .toLowerCase()
                .includes(q.toLowerCase()),
            )
            .map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={value.skills.some(
                    (v) => v.skillId === s.id && v.required === required,
                  )}
                  onCheckedChange={(checked) => {
                    const previous = value.skills.find(
                      (v) => v.skillId === s.id,
                    );
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
      </BriefToken>
    );
  };
  return (
    <div className="text-lg font-medium leading-[1.75] text-muted-foreground md:text-[19px] xl:text-[22px]">
      Ищем специалиста
      <BriefToken
        {...token('specialization')}
        title="Специализация"
        label={
          catalogs.specializations.find((s) => s.id === value.specializationId)
            ?.name ?? 'специализация'
        }
        empty={!value.specializationId}
      >
        <div className="max-h-64 overflow-y-auto">
          {catalogs.specializations.map((s) =>
            option(
              s.id,
              s.name,
              () => change({ specializationId: s.id }),
              s.id === value.specializationId,
            ),
          )}
        </div>
      </BriefToken>
      уровня
      <BriefToken
        {...token('grade')}
        title="Грейд"
        label={
          catalogs.grades.find((g) => g.id === value.gradeId)?.name ??
          'любой грейд'
        }
        empty={!value.gradeId}
      >
        {option(
          null,
          'Не указывать',
          () => change({ gradeId: null }),
          value.gradeId === null,
        )}
        {catalogs.grades.map((g) =>
          option(
            g.id,
            g.name,
            () => change({ gradeId: g.id }),
            value.gradeId === g.id,
          ),
        )}
      </BriefToken>
      , формат —
      <BriefToken
        {...token('formats')}
        title="Форматы работы"
        empty={!value.workFormatIds.length}
        label={
          catalogs.workFormats
            .filter((f) => value.workFormatIds.includes(f.id))
            .map((f) => f.name)
            .join(', ') || 'формат'
        }
      >
        <div className="grid gap-3">
          {catalogs.workFormats.map((f) => (
            <label key={f.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={value.workFormatIds.includes(f.id)}
                onCheckedChange={(checked) =>
                  change({
                    workFormatIds: checked
                      ? [...value.workFormatIds, f.id]
                      : value.workFormatIds.filter((id) => id !== f.id),
                  })
                }
              />
              {f.name}
            </label>
          ))}
        </div>
      </BriefToken>
      , вилка
      <BriefToken
        {...token('salary')}
        title="Зарплатная вилка"
        empty={value.salaryFromRub === null && value.salaryToRub === null}
        label={formatSalaryRange(value.salaryFromRub, value.salaryToRub)}
      >
        <SalaryRangeInput
          from={value.salaryFromRub}
          to={value.salaryToRub}
          errors={{ from: errors.salaryFromRub, to: errors.salaryToRub }}
          onChange={(range) =>
            change({ salaryFromRub: range.from, salaryToRub: range.to })
          }
        />
        <p className="mt-3 text-xs text-muted-foreground">
          Можно оставить обе границы пустыми. Вилка обязательна в предложении
          кандидату.
        </p>
      </BriefToken>
      . Обязательно — {skillToken(true)}, желательно — {skillToken(false)}.
    </div>
  );
};
