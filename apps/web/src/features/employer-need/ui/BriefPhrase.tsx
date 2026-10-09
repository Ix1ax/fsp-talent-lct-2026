'use client';

import { useState } from 'react';

import {
  BriefToken,
  Button,
  Checkbox,
  Input,
  SalaryRangeInput,
} from '@/shared/ui';
import { formatSalaryRange } from '@/shared/utils';
import type { Catalogs, Skill } from '@/entities/catalog';
import type { NeedInput } from '@/entities/employer-need';

import { MAX_NEED_SKILLS } from '../constants';

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
    onOpenChange: (v: boolean) => {
      setQ('');
      setOpen(v ? key : null);
    },
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
      className="min-h-11 w-full justify-start whitespace-normal text-left"
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
        label={selected.map((s) => s.name).join(', ') || '+ навык'}
      >
        <Input
          aria-label="Поиск навыка"
          placeholder="Поиск по справочнику"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="grid max-h-64 gap-3 overflow-auto">
          {skills
            .filter((s) =>
              [s.name, ...s.aliases]
                .join(' ')
                .toLowerCase()
                .includes(q.toLowerCase()),
            )
            .map((s) => (
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
                    const previous = value.skills.find(
                      (v) => v.skillId === s.id,
                    );
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
          Выбрано {value.skills.length} из {MAX_NEED_SKILLS} навыков. Лимит
          общий для обязательных и желательных.
        </p>
      </BriefToken>
    );
  };
  const specialization = (
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
  );
  const grade = (
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
  );
  const formats = (
    <BriefToken
      {...token('formats')}
      title="Форматы работы"
      empty={!value.workFormatIds.length}
      label={
        catalogs.workFormats
          .filter((f) => value.workFormatIds.includes(f.id))
          .map((f) => f.name.toLowerCase())
          .join(', ') || 'формат'
      }
    >
      <div className="grid gap-3">
        {catalogs.workFormats.map((f) => (
          <label
            key={f.id}
            className="flex min-h-11 items-center gap-3 text-base"
          >
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
  );
  const salaryEmpty =
    value.salaryFromRub === null && value.salaryToRub === null;
  const salary = (
    <BriefToken
      {...token('salary')}
      title="Зарплатная вилка"
      empty={salaryEmpty}
      label={
        salaryEmpty
          ? 'не указана'
          : formatSalaryRange(value.salaryFromRub, value.salaryToRub)
      }
    >
      <SalaryRangeInput
        from={value.salaryFromRub}
        to={value.salaryToRub}
        errors={{ from: errors.salaryFromRub, to: errors.salaryToRub }}
        onChange={(range) =>
          change({ salaryFromRub: range.from, salaryToRub: range.to })
        }
      />
      <p className="text-xs text-muted-foreground">
        Можно оставить обе границы пустыми. Вилка обязательна в предложении
        кандидату.
      </p>
    </BriefToken>
  );

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xl leading-[2.6rem] text-pretty">
        Ищем специалиста {specialization} уровня {grade}, формат — {formats},
        вилка {salary}. Обязательно — {skillToken(true)}, желательно —{' '}
        {skillToken(false)}.
      </p>
      {!disabled && (
        <p className="text-sm text-muted-foreground">
          Подсвеченные слова — значения справочника. Нажмите, чтобы изменить.
        </p>
      )}
    </div>
  );
};
