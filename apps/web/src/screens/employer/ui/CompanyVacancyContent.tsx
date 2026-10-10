import { ArrowRightIcon } from 'lucide-react';

import type { useRemoteData } from '@/shared/hooks/useRemoteData';
import { AsyncState, Button, Skeleton } from '@/shared/ui';
import type { Catalogs, Skill } from '@/entities/catalog';
import type { EmployerNeed } from '@/entities/employer-need';

import type { EmployerGateway } from '../lib/gateway';
import { VacancyCard } from './VacancyCard';

interface CompanyVacancyContentProps {
  catalogs: Catalogs;
  skills: Skill[];
  busy: boolean;
  onVacancies: () => void;
  onOpen: (need: EmployerNeed) => void;
  remote: ReturnType<
    typeof useRemoteData<Awaited<ReturnType<EmployerGateway['needs']>>>
  >;
}

export const CompanyVacancyContent = ({
  remote,
  busy,
  onVacancies,
  catalogs,
  skills,
  onOpen,
}: CompanyVacancyContentProps) => {
  if (remote.loading) {
    return <Skeleton className="h-48 rounded-xl" />;
  }

  if (remote.error) {
    return (
      <AsyncState
        error
        title="Не удалось загрузить потребности"
        description={remote.error}
        onRetry={remote.retry}
      />
    );
  }

  if (!remote.data?.items.length) {
    return (
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
    );
  }

  return (
    <>
      {remote.data.items.slice(0, 3).map((need) => (
        <VacancyCard
          key={need.id}
          need={need}
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
  );
};
