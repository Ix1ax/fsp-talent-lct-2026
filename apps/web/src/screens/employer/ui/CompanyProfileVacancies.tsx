import { useCallback } from 'react';
import { ArrowRightIcon, BriefcaseBusinessIcon } from 'lucide-react';

import { useRemoteData } from '@/shared/hooks/useRemoteData';
import { AsyncState, Button, Skeleton } from '@/shared/ui';
import type { Catalogs, Skill } from '@/entities/catalog';
import type { Company } from '@/entities/company';
import type { EmployerNeed } from '@/entities/employer-need';

import type { EmployerGateway } from '../lib/gateway';
import { VacancyCard } from './VacancyCard';

interface CompanyProfileVacanciesProps {
  active: boolean;
  company: Company;
  api: EmployerGateway;
  catalogs: Catalogs;
  skills: Skill[];
  revision: number;
  busy: boolean;
  onVacancies: () => void;
  onOpen: (need: EmployerNeed) => void;
}

export const CompanyProfileVacancies = ({
  active,
  company,
  api,
  catalogs,
  skills,
  revision,
  busy,
  onVacancies,
  onOpen,
}: CompanyProfileVacanciesProps) => {
  const load = useCallback(
    (signal: AbortSignal) => api.needs(company.id, 'active', 0, signal),
    [api, company.id],
  );
  const remote = useRemoteData(load, revision, active);

  return (
    <section
      aria-label="Активные потребности компании"
      className="grid min-w-0 gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <BriefcaseBusinessIcon className="size-5 text-muted-foreground" />
          Активные потребности
        </h2>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={onVacancies}
          className="text-brand-text"
        >
          Потребности <ArrowRightIcon />
        </Button>
      </div>
      {remote.loading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : remote.error ? (
        <AsyncState
          error
          title="Не удалось загрузить потребности"
          description={remote.error}
          onRetry={remote.retry}
        />
      ) : !remote.data?.items.length ? (
        <div className="grid justify-items-start gap-3 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h3 className="font-semibold">Открытых потребностей пока нет</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Активные потребности компании появятся здесь. В банке потребностей
            доступны черновики и архив.
          </p>
          <Button variant="outline" disabled={busy} onClick={onVacancies}>
            Перейти к потребностьм <ArrowRightIcon />
          </Button>
        </div>
      ) : (
        <>
          {remote.data.items.slice(0, 3).map((need) => (
            <VacancyCard
              key={need.id}
              need={need}
              company={company}
              catalogs={catalogs}
              skills={skills}
              busy={busy}
              onOpen={() => onOpen(need)}
            />
          ))}
          {remote.data.items.length > 3 && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={onVacancies}
              className="justify-self-start"
            >
              Все активные потребности <ArrowRightIcon />
            </Button>
          )}
        </>
      )}
    </section>
  );
};
