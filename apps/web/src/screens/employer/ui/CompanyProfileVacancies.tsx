import { useCallback } from 'react';
import { ArrowRightIcon, BriefcaseBusinessIcon } from 'lucide-react';

import { useRemoteData } from '@/shared/hooks/useRemoteData';
import { Button } from '@/shared/ui';
import type { Catalogs, Skill } from '@/entities/catalog';
import type { Company } from '@/entities/company';
import type { EmployerNeed } from '@/entities/employer-need';

import type { EmployerGateway } from '../lib/gateway';
import { CompanyVacancyContent } from './CompanyVacancyContent';

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
      <CompanyVacancyContent
        remote={remote}
        busy={busy}
        onVacancies={onVacancies}
        catalogs={catalogs}
        skills={skills}
        onOpen={onOpen}
      />
    </section>
  );
};
