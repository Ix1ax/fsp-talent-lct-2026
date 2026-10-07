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
        'h-auto w-full justify-start rounded-none border-0 bg-transparent p-4 text-left whitespace-normal hover:bg-muted',
        'flex-col items-stretch gap-2 border-b border-border xl:px-5',
        selected && 'bg-muted shadow-[inset_3px_0_0_var(--primary)]',
      )}
    >
      <span className="flex w-full flex-wrap items-center gap-y-2">
        <SpecializationBadge
          specialization={spec}
          grade={grade}
          active={need.status === 'active'}
        />
        <span className="min-w-0 flex-1 truncate pl-2 text-sm text-muted-foreground">
          {[formats, need.city].filter(Boolean).join(' · ')}
        </span>
        <span
          className={cn(
            'ml-auto shrink-0 pl-2',
            need.salaryFromRub === null && need.salaryToRub === null
              ? 'text-xs text-caption'
              : 'font-mono text-[17px] font-medium tracking-tight',
          )}
        >
          {formatSalaryRange(need.salaryFromRub, need.salaryToRub, true)}
        </span>
      </span>
      <span className="text-base font-semibold leading-snug">{need.title}</span>
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
