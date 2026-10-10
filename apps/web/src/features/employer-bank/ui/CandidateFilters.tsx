import { RotateCcwIcon, SlidersHorizontalIcon } from 'lucide-react';

import { Button, Checkbox, Input, OptionSelect } from '@/shared/ui';
import { type Catalogs, SkillPicker } from '@/entities/catalog';
import type { BankFilters } from '@/entities/employer-bank';
import type { EmployerNeed } from '@/entities/employer-need';

interface CandidateFiltersProps {
  filters: BankFilters;
  catalogs: Catalogs;
  needs: EmployerNeed[];
  needId: string;
  needsLoading: boolean;
  needsError: string;
  busy: boolean;
  experienceMin: string;
  experienceMax: string;
  error: string | null;
  onChange: (patch: Partial<BankFilters>) => void;
  onNeed: (id: string) => void;
  onNeeds: () => void;
  onRetryNeeds: () => void;
  onExperienceMin: (value: string) => void;
  onExperienceMax: (value: string) => void;
  onReset: () => void;
}
export const CandidateFilters = ({
  filters,
  catalogs,
  needs,
  needId,
  needsLoading,
  needsError,
  busy,
  experienceMin,
  experienceMax,
  error,
  onChange,
  onNeed,
  onNeeds,
  onRetryNeeds,
  onExperienceMin,
  onExperienceMax,
  onReset,
}: CandidateFiltersProps) => {
  return (
    <div className="grid gap-5 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <SlidersHorizontalIcon className="size-4" />
          Фильтры
        </h2>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Сбросить фильтры соискателей"
          disabled={busy}
          onClick={onReset}
        >
          <RotateCcwIcon />
        </Button>
      </div>
      <div className="grid gap-2 border-b pb-5">
        <label className="grid gap-2 text-sm font-medium">
          Потребность
          <OptionSelect
            aria-label="Потребность для поиска соискателей"
            value={needId}
            disabled={busy || needsLoading || !!needsError}
            onValueChange={onNeed}
            options={[
              {
                value: '',
                label: needsLoading
                  ? 'Загружаем потребности…'
                  : 'Без привязки к потребности',
              },
              ...needs.map((need) => ({ value: need.id, label: need.title })),
            ]}
          />
        </label>
        {needsError ? (
          <>
            <p role="alert" className="text-xs text-destructive">
              {needsError}
            </p>
            <Button
              variant="link"
              size="sm"
              disabled={busy}
              onClick={onRetryNeeds}
              className="justify-self-start p-0"
            >
              Повторить загрузку
            </Button>
          </>
        ) : !needsLoading && !needs.length ? (
          <>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Для подбора по требованиям нужна активная потребность.
            </p>
            <Button
              variant="link"
              size="sm"
              disabled={busy}
              onClick={onNeeds}
              className="justify-self-start p-0 text-brand-text"
            >
              Потребности компании
            </Button>
          </>
        ) : (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Изменение фильтров снимает привязку. Верните условия выбранной
            потребности — привязка восстановится.
          </p>
        )}
      </div>
      <fieldset disabled={busy} className="grid gap-5">
        <label className="grid gap-2 text-sm font-medium text-muted-foreground">
          Специализация
          <OptionSelect
            aria-label="Специализация"
            disabled={busy}
            value={filters.specializationId ?? ''}
            onValueChange={(value) =>
              onChange({ specializationId: value ? Number(value) : undefined })
            }
            options={[
              { value: '', label: 'Любая' },
              ...catalogs.specializations.map((item) => ({
                value: item.id,
                label: item.name,
              })),
            ]}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-muted-foreground">
          Грейд
          <OptionSelect
            aria-label="Грейд"
            disabled={busy}
            value={filters.gradeId ?? ''}
            onValueChange={(value) =>
              onChange({ gradeId: value ? Number(value) : undefined })
            }
            options={[
              { value: '', label: 'Любой' },
              ...catalogs.grades.map((item) => ({
                value: item.id,
                label: item.name,
              })),
            ]}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-muted-foreground">
          Подтверждение грейда
          <OptionSelect
            aria-label="Подтверждение грейда"
            disabled={busy}
            value={filters.gradeStatus ?? 'all'}
            onValueChange={(value) =>
              onChange({ gradeStatus: value as BankFilters['gradeStatus'] })
            }
            options={[
              { value: 'all', label: 'Все кандидаты' },
              { value: 'confirmed', label: 'Подтверждён тестом' },
              { value: 'unconfirmed', label: 'Без подтверждения' },
            ]}
          />
        </label>
        <div className="grid gap-3">
          <label className="grid gap-2 text-sm font-medium text-muted-foreground">
            Навык
            <SkillPicker
              disabled={busy}
              value={filters.skillId ?? ''}
              onValueChange={(value) =>
                onChange({
                  skillId: value || undefined,
                  verifiedSkillOnly: undefined,
                })
              }
            />
          </label>
          <label className="flex min-h-9 items-center gap-3 text-sm">
            <Checkbox
              disabled={busy || !filters.skillId}
              checked={filters.verifiedSkillOnly ?? false}
              onCheckedChange={(value) =>
                onChange({ verifiedSkillOnly: value === true })
              }
            />
            Только подтверждённый навык
          </label>
        </div>
        <label className="grid gap-2 text-sm font-medium text-muted-foreground">
          Достижения ФСП
          <OptionSelect
            aria-label="Достижения ФСП"
            disabled={busy}
            value={
              filters.hasFspAchievements === undefined
                ? ''
                : String(filters.hasFspAchievements)
            }
            onValueChange={(value) =>
              onChange({
                hasFspAchievements: value ? value === 'true' : undefined,
              })
            }
            options={[
              { value: '', label: 'Не учитывать' },
              { value: 'true', label: 'Есть достижения' },
              { value: 'false', label: 'Без достижений' },
            ]}
          />
        </label>
        <div className="grid gap-3 border-t pt-5">
          <h3 className="text-sm font-medium text-muted-foreground">
            Опыт, лет
          </h3>
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
        <label className="grid gap-2 text-sm font-medium text-muted-foreground">
          Зарплатные ожидания до, ₽
          <Input
            type="number"
            min={0}
            max={1000000000}
            step={1}
            value={filters.salaryMaxRub ?? ''}
            onChange={(event) =>
              onChange({
                salaryMaxRub: event.target.value
                  ? Number(event.target.value)
                  : undefined,
              })
            }
          />
        </label>
        <div className="grid gap-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Формат работы
          </h3>
          <div className="flex flex-wrap gap-2">
            {catalogs.workFormats.map((format) => {
              const selected =
                filters.workFormatIds?.includes(format.id) ?? false;
              return (
                <Button
                  key={format.id}
                  type="button"
                  size="sm"
                  variant={selected ? 'secondary' : 'ghost'}
                  aria-pressed={selected}
                  className={
                    selected
                      ? 'h-8 bg-primary/10 px-2 text-xs text-brand-text'
                      : 'h-8 bg-muted/60 px-2 text-xs'
                  }
                  onClick={() =>
                    onChange({
                      workFormatIds: selected
                        ? filters.workFormatIds?.filter(
                            (id) => id !== format.id,
                          )
                        : [...(filters.workFormatIds ?? []), format.id],
                    })
                  }
                >
                  {format.name}
                </Button>
              );
            })}
          </div>
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button variant="outline" disabled={busy} onClick={onReset}>
        Сбросить фильтры
      </Button>
    </div>
  );
};
