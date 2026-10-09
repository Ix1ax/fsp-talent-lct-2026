import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { formatSalaryRange } from '@/shared/utils';
import type { Catalogs } from '@/entities/catalog';
import { SpecializationBadge } from '@/entities/catalog';
import {
  type EmployerNeed,
  getMissingNeedFields,
} from '@/entities/employer-need';

interface NeedListItemProps {
  need: EmployerNeed;
  catalogs: Catalogs;
  selected: boolean;
  onSelect: () => void;
}

export const NeedListItem = ({
  need,
  catalogs,
  selected,
  onSelect,
}: NeedListItemProps) => {
  const spec = catalogs.specializations.find(
    (s) => s.id === need.specializationId,
  );
  const grade = catalogs.grades.find((g) => g.id === need.gradeId);
  const formats = catalogs.workFormats
    .filter((f) => need.workFormatIds.includes(f.id))
    .map((f) => f.name)
    .join(', ');

  return (
    <Button
      variant="ghost"
      size="default"
      type="button"
      aria-current={selected ? 'true' : undefined}
      onClick={onSelect}
      className={cn(
        'h-auto w-full justify-start rounded-lg border-0 bg-transparent px-3 py-3.5 text-left font-normal whitespace-normal hover:bg-hover',
        'flex-col items-stretch gap-2',
        selected && 'bg-accent hover:bg-accent',
      )}
    >
      <span className="flex w-full min-w-0 items-center gap-2.5">
        <SpecializationBadge
          specialization={spec}
          grade={grade}
          active={need.status === 'active'}
        />
        <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-muted-foreground">
          {[formats, need.city].filter(Boolean).join(' · ')}
        </span>
        <span
          className={cn(
            'shrink-0',
            need.salaryFromRub === null && need.salaryToRub === null
              ? 'text-xs text-caption'
              : 'font-mono text-sm font-medium tabular-nums',
          )}
        >
          {formatSalaryRange(need.salaryFromRub, need.salaryToRub, true)}
        </span>
      </span>
      <span className="text-base leading-snug font-semibold">{need.title}</span>
      {need.status === 'draft' && (
        <span className="text-xs text-warning">
          {getMissingNeedFields(need).length
            ? `Не заполнено: ${getMissingNeedFields(need).join(', ')}`
            : 'Готова к активации'}
        </span>
      )}
      {need.status === 'archived' && (
        <span className="text-xs text-caption">В архиве</span>
      )}
    </Button>
  );
};
