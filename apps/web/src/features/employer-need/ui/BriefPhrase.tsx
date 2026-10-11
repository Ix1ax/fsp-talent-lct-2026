'use client';
import { useState } from 'react';

import { BriefToken, Button, Checkbox, SalaryRangeInput } from '@/shared/ui';
import { formatSalaryRange } from '@/shared/utils';
import { type Catalogs, type Skill } from '@/entities/catalog';
import { type NeedInput } from '@/entities/employer-need';

import { BriefSkillsToken } from './BriefSkillsToken';

interface BriefPhraseProps {
  value: NeedInput;
  onChange: (value: NeedInput) => void;
  catalogs: Catalogs;
  skills: Skill[];
  searchItems: Skill[];
  skillQuery: string;
  onSkillQuery: (query: string) => void;
  skillsLoading: boolean;
  skillsError: string;
  onRetrySkills: () => void;
  catalogsUnavailable: boolean;
  disabled?: boolean;
  errors: Record<string, string>;
}

export const BriefPhrase = ({
  value,
  onChange,
  catalogs,
  skills,
  searchItems,
  skillQuery,
  onSkillQuery,
  skillsLoading,
  skillsError,
  onRetrySkills,
  catalogsUnavailable,
  disabled,
  errors,
}: BriefPhraseProps) => {
  const [open, setOpen] = useState<string | null>(null);
  const change = (patch: Partial<NeedInput>) =>
    onChange({ ...value, ...patch });
  const token = (key: string) => ({
    open: open === key,
    onOpenChange: (v: boolean) => {
      onSkillQuery('');
      setOpen(v ? key : null);
    },
    disabled:
      disabled ||
      (catalogsUnavailable &&
        ['specialization', 'grade', 'formats'].includes(key)),
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
        вилка {salary}. Обязательно —{' '}
        <BriefSkillsToken
          required={true}
          {...token('requiredSkills')}
          value={value}
          skills={skills}
          searchItems={searchItems}
          skillQuery={skillQuery}
          onSkillQuery={onSkillQuery}
          skillsLoading={skillsLoading}
          skillsError={skillsError}
          onRetrySkills={onRetrySkills}
          change={change}
        />
        , желательно —{' '}
        <BriefSkillsToken
          required={false}
          {...token('optionalSkills')}
          value={value}
          skills={skills}
          searchItems={searchItems}
          skillQuery={skillQuery}
          onSkillQuery={onSkillQuery}
          skillsLoading={skillsLoading}
          skillsError={skillsError}
          onRetrySkills={onRetrySkills}
          change={change}
        />
        .
      </p>
      {!disabled && (
        <p className="text-sm text-muted-foreground">
          Подсвеченные слова — значения справочника. Нажмите, чтобы изменить.
        </p>
      )}
    </div>
  );
};
