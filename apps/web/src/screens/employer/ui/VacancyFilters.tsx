import { RotateCcwIcon, SlidersHorizontalIcon } from 'lucide-react';

import { Button, OptionSelect } from '@/shared/ui';
import { type Catalogs, SkillPicker } from '@/entities/catalog';
import type { VacancyFilters as Filters } from '@/features/employer-search';

interface VacancyFiltersProps {
  value: Filters;
  catalogs: Catalogs;
  disabled: boolean;
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
}
export const VacancyFilters = ({
  value,
  catalogs,
  disabled,
  onChange,
  onReset,
}: VacancyFiltersProps) => (
  <div className="grid gap-6 rounded-xl border border-border bg-card p-5">
    <div className="flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 font-semibold">
        <SlidersHorizontalIcon className="size-4" /> Фильтры
      </h2>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Сбросить фильтры потребностей"
        disabled={disabled}
        onClick={onReset}
      >
        <RotateCcwIcon />
      </Button>
    </div>
    <fieldset disabled={disabled} className="grid gap-6">
      <div className="grid gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Формат работы
        </h3>
        <div className="flex flex-wrap gap-2">
          {catalogs.workFormats.map((format) => (
            <Button
              key={format.id}
              type="button"
              size="sm"
              variant={
                value.workFormatIds.includes(format.id) ? 'secondary' : 'ghost'
              }
              aria-pressed={value.workFormatIds.includes(format.id)}
              className={
                value.workFormatIds.includes(format.id)
                  ? 'h-8 border-primary/25 bg-primary/10 px-2 text-xs text-brand-text'
                  : 'h-8 bg-muted/60 px-2 text-xs'
              }
              onClick={() =>
                onChange({
                  workFormatIds: value.workFormatIds.includes(format.id)
                    ? value.workFormatIds.filter((id) => id !== format.id)
                    : [...value.workFormatIds, format.id],
                })
              }
            >
              {format.name}
            </Button>
          ))}
        </div>
      </div>
      <label className="grid gap-2 text-sm font-medium text-muted-foreground">
        Специализация
        <OptionSelect
          aria-label="Специализация"
          disabled={disabled}
          value={value.specializationId}
          onValueChange={(value) =>
            onChange({ specializationId: Number(value) })
          }
          options={[
            { value: 0, label: 'Все специализации' },
            ...catalogs.specializations.map((item) => ({
              value: item.id,
              label: item.name,
            })),
          ]}
        />
      </label>
      <div className="grid gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">Грейд</h3>
        <div className="flex flex-wrap gap-2">
          {catalogs.grades.map((grade) => (
            <Button
              key={grade.id}
              type="button"
              size="sm"
              variant={value.gradeId === grade.id ? 'secondary' : 'ghost'}
              aria-pressed={value.gradeId === grade.id}
              className={
                value.gradeId === grade.id
                  ? 'h-8 border-primary/25 bg-primary/10 px-2 text-xs text-brand-text'
                  : 'h-8 bg-muted/60 px-2 text-xs'
              }
              onClick={() =>
                onChange({ gradeId: value.gradeId === grade.id ? 0 : grade.id })
              }
            >
              {grade.name}
            </Button>
          ))}
        </div>
      </div>
      <label className="grid gap-2 text-sm font-medium text-muted-foreground">
        Навык
        <SkillPicker
          disabled={disabled}
          value={value.skillId}
          onValueChange={(value) => onChange({ skillId: value })}
          emptyLabel="Все навыки"
        />
      </label>
    </fieldset>
    <p className="border-t pt-4 text-xs leading-relaxed text-muted-foreground">
      Поиск в потребностях выбранной компании. Для выбора коллег откройте банк
      соискателей.
    </p>
  </div>
);
