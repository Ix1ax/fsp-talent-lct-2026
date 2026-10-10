import { ArrowUpRightIcon, MapPinIcon } from 'lucide-react';

import { Badge, Button } from '@/shared/ui';
import { formatSalaryRange } from '@/shared/utils';
import type { Catalogs, Skill } from '@/entities/catalog';
import type { Company } from '@/entities/company';
import type { EmployerNeed } from '@/entities/employer-need';
import { NEED_DETAIL_STATUS_LABELS } from '@/entities/employer-need';

interface VacancyCardProps {
  need: EmployerNeed;
  company: Company;
  catalogs: Catalogs;
  skills: Skill[];
  busy: boolean;
  onOpen: () => void;
}
export const VacancyCard = ({
  need,
  company,
  catalogs,
  skills,
  busy,
  onOpen,
}: VacancyCardProps) => {
  const grade = catalogs.grades.find((item) => item.id === need.gradeId)?.name;
  const specialization = catalogs.specializations.find(
    (item) => item.id === need.specializationId,
  )?.name;
  const skillNames = need.skills.map(
    (item) =>
      skills.find((skill) => skill.id === item.skillId)?.name ??
      `Навык #${item.skillId}`,
  );
  return (
    <article className="group grid min-w-0 gap-4 rounded-2xl border border-border/70 bg-card p-5 transition-colors hover:border-primary/35 sm:p-6">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted font-semibold"
          aria-hidden="true"
        >
          {company.name.trim().slice(0, 1).toLocaleUpperCase('ru')}
        </span>
        <span className="max-w-56 truncate font-medium text-foreground">
          {company.name}
        </span>
        {need.workFormatIds.map((id) => (
          <Badge key={id} variant="secondary" className="rounded-md">
            {catalogs.workFormats.find((format) => format.id === id)?.name ??
              `Формат #${id}`}
          </Badge>
        ))}
        {grade && (
          <Badge variant="secondary" className="rounded-md">
            {grade}
          </Badge>
        )}
        <span className="ml-auto">
          {new Date(need.createdAt).toLocaleDateString('ru-RU')}
        </span>
      </div>
      <div className="flex min-w-0 flex-col items-start justify-between gap-3 sm:flex-row">
        <div className="grid min-w-0 gap-2">
          <h2 className="text-xl font-semibold leading-snug [overflow-wrap:anywhere]">
            <button
              type="button"
              disabled={busy}
              onClick={onOpen}
              className="text-left transition-colors hover:text-brand-text focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
            >
              {need.title}
            </button>
          </h2>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>
              {specialization ?? `Специализация #${need.specializationId}`}
            </span>
            <span className="inline-flex min-w-0 items-center gap-1 [overflow-wrap:anywhere]">
              <MapPinIcon className="size-3.5 shrink-0" />
              {need.city || 'Любой город'}
            </span>
          </p>
        </div>
        <p className="shrink-0 text-base font-semibold sm:text-right">
          {formatSalaryRange(need.salaryFromRub, need.salaryToRub)}
        </p>
      </div>
      <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
        {need.description}
      </p>
      <div className="flex flex-wrap items-center gap-2">
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
            +{skillNames.length - 5} навыков
          </span>
        )}
        <Badge
          variant={need.status === 'active' ? 'success' : 'outline'}
          className="rounded-md"
        >
          {NEED_DETAIL_STATUS_LABELS[need.status]}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={onOpen}
          className="ml-auto text-brand-text"
          aria-label={`Открыть потребность: ${need.title}`}
        >
          Открыть <ArrowUpRightIcon />
        </Button>
      </div>
    </article>
  );
};
