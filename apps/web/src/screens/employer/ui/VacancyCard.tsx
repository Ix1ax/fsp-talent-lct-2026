import { ArrowRightIcon, MapPinIcon } from 'lucide-react';

import { Badge, Button } from '@/shared/ui';
import { formatSalaryRange, pluralizeRu } from '@/shared/utils';
import type { Catalogs, Skill } from '@/entities/catalog';
import type { EmployerNeed, NeedStatus } from '@/entities/employer-need';
import { NEED_DETAIL_STATUS_LABELS } from '@/entities/employer-need';

interface VacancyCardProps {
  need: EmployerNeed;
  catalogs: Catalogs;
  skills: Skill[];
  busy: boolean;
  onOpen: () => void;
}

// Что работодатель получит, открыв потребность: главное действие по статусу.
const OPEN_LABELS: Record<NeedStatus, string> = {
  active: 'Подбор кандидатов',
  draft: 'Дополнить бриф',
  archived: 'Посмотреть',
};

const SKILL_FORMS = ['навык', 'навыка', 'навыков'] as const;

export const VacancyCard = ({
  need,
  catalogs,
  skills,
  busy,
  onOpen,
}: VacancyCardProps) => {
  const grade = catalogs.grades.find((item) => item.id === need.gradeId)?.name;
  const specialization = catalogs.specializations.find(
    (item) => item.id === need.specializationId,
  )?.name;
  const formats = need.workFormatIds.map(
    (id) =>
      catalogs.workFormats.find((format) => format.id === id)?.name ??
      `Формат #${id}`,
  );
  // Потребность хранит только ID навыков; без названий показываем количество,
  // а не технический идентификатор.
  const skillNames = need.skills
    .map((item) => skills.find((skill) => skill.id === item.skillId)?.name)
    .filter((name): name is string => !!name);
  const namesKnown = skillNames.length === need.skills.length;

  return (
    <article className="grid min-w-0 gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/35 sm:p-6">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="grid min-w-0 gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={need.status === 'active' ? 'success' : 'outline'}
              className="rounded-md"
            >
              {NEED_DETAIL_STATUS_LABELS[need.status]}
            </Badge>
            <span className="text-xs whitespace-nowrap text-muted-foreground">
              от {new Date(need.createdAt).toLocaleDateString('ru-RU')}
            </span>
          </div>
          <h2 className="text-xl leading-snug font-semibold [overflow-wrap:anywhere]">
            <button
              type="button"
              disabled={busy}
              onClick={onOpen}
              className="text-left transition-colors hover:text-brand-text focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
            >
              {need.title}
            </button>
          </h2>
        </div>
        <p className="text-base font-semibold whitespace-nowrap">
          {formatSalaryRange(need.salaryFromRub, need.salaryToRub)}
        </p>
      </div>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span>
          {specialization ?? `Специализация #${need.specializationId}`}
          {grade && ` · ${grade}`}
        </span>
        {formats.length > 0 && <span>{formats.join(', ')}</span>}
        <span className="inline-flex min-w-0 items-center gap-1 [overflow-wrap:anywhere]">
          <MapPinIcon className="size-3.5 shrink-0" aria-hidden="true" />
          {need.city || 'Любой город'}
        </span>
      </p>
      {need.description && (
        <p className="line-clamp-2 text-sm leading-relaxed [overflow-wrap:anywhere]">
          {need.description}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
        {namesKnown ? (
          <>
            {skillNames.slice(0, 5).map((name, i) => (
              <Badge
                key={need.skills[i].skillId}
                variant="secondary"
                className="max-w-full truncate rounded-md bg-muted/70"
              >
                {name}
              </Badge>
            ))}
            {skillNames.length > 5 && (
              <span className="text-xs text-muted-foreground">
                +{pluralizeRu(skillNames.length - 5, SKILL_FORMS)}
              </span>
            )}
          </>
        ) : (
          need.skills.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {pluralizeRu(need.skills.length, SKILL_FORMS)} в требованиях
            </span>
          )
        )}
        <Button
          variant={need.status === 'active' ? 'default' : 'outline'}
          size="sm"
          disabled={busy}
          onClick={onOpen}
          className="ml-auto"
          aria-label={`${OPEN_LABELS[need.status]}: ${need.title}`}
        >
          {OPEN_LABELS[need.status]}
          <ArrowRightIcon />
        </Button>
      </div>
    </article>
  );
};
