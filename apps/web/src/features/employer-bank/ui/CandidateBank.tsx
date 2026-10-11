'use client';
import { SlidersHorizontalIcon } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { Badge, Button, PageControls, RemoteState } from '@/shared/ui';
import { type Catalogs, type Skill } from '@/entities/catalog';
import { type Company } from '@/entities/company';
import { type EmployerBankApi } from '@/entities/employer-bank';
import { type EmployerNeed } from '@/entities/employer-need';

import { filtersForNeed } from '../lib';
import { useCandidateBank } from '../model';
import { CandidateCard } from './CandidateCard';
import { CandidateDetails } from './CandidateDetails';
import { CandidateFilters } from './CandidateFilters';
import { OfferComposer } from './OfferComposer';
import { RecommendationCard } from './RecommendationCard';

interface CandidateBankProps {
  company: Company;
  catalogs: Catalogs;
  skills: Skill[];
  api: EmployerBankApi;
  onBusyChange: (busy: boolean) => void;
  loadNeeds: (signal: AbortSignal) => Promise<EmployerNeed[]>;
  revision: number;
  onNeeds: () => void;
}

export const CandidateBank = ({
  company,
  catalogs,
  skills,
  api,
  onBusyChange,
  loadNeeds,
  revision,
  onNeeds,
}: CandidateBankProps) => {
  const {
    filters,
    setFilters,
    experienceMin,
    setExperienceMin,
    experienceMax,
    setExperienceMax,
    offset,
    setOffset,
    candidateId,
    setCandidateId,
    offer,
    setOffer,
    busy,
    filtersOpen,
    setFiltersOpen,
    setReferenceNeedId,
    needs,
    filterError,
    selectedNeed,
    needId,
    remote,
    change,
    reset,
    recommendations,
    bank,
    busyChanged,
  } = useCandidateBank({ company, api, onBusyChange, loadNeeds, revision });
  return (
    <>
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Button
          variant="outline"
          className="justify-self-start lg:hidden"
          aria-expanded={filtersOpen}
          aria-controls="candidate-filters"
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <SlidersHorizontalIcon />
          {filtersOpen ? 'Скрыть фильтры' : 'Фильтры соискателей'}
        </Button>
        <aside
          id="candidate-filters"
          aria-label="Фильтры соискателей"
          className={cn('min-w-0', !filtersOpen && 'hidden lg:block')}
        >
          <CandidateFilters
            filters={filters}
            catalogs={catalogs}
            needs={needs.data ?? []}
            needId={needId}
            needsLoading={needs.loading}
            needsError={needs.error}
            busy={busy}
            experienceMin={experienceMin}
            experienceMax={experienceMax}
            error={filterError}
            onChange={change}
            onNeed={(id) => {
              const need = needs.data?.find((item) => item.id === id);
              setReferenceNeedId(need?.id ?? '');
              setFilters(need ? filtersForNeed(need) : {});
              setExperienceMin('');
              setExperienceMax('');
              setOffset(0);
            }}
            onNeeds={onNeeds}
            onRetryNeeds={needs.retry}
            onExperienceMin={(value) => {
              setExperienceMin(value);
              change({
                experienceMinMonths: value
                  ? Math.round(Number(value) * 12)
                  : undefined,
              });
            }}
            onExperienceMax={(value) => {
              setExperienceMax(value);
              change({
                experienceMaxMonths: value
                  ? Math.round(Number(value) * 12)
                  : undefined,
              });
            }}
            onReset={reset}
          />
        </aside>
        <div className="grid min-w-0 gap-5">
          <div className="grid gap-3 rounded-xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-xl font-semibold">
              {selectedNeed
                ? `Подбор по потребности: ${selectedNeed.title}`
                : 'Доступные соискатели'}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {selectedNeed
                ? 'Требования потребности применены. Изменение фильтров снимет привязку к потребности.'
                : 'Выберите потребность или задайте условия поиска в фильтрах.'}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Открытые и приглашённые кандидаты на время скрываются из подборки
              вашей компании, чтобы не получать повторные контакты подряд.
            </p>
            {selectedNeed && (
              <>
                <div className="flex flex-wrap gap-2">
                  {selectedNeed.skills.map((item) => (
                    <Badge
                      key={item.skillId}
                      variant="secondary"
                      className="max-w-full truncate rounded-md"
                    >
                      {skills.find((skill) => skill.id === item.skillId)
                        ?.name ?? 'Навык из потребности'}
                      {item.required ? ' · обязательный' : ''}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Подбор учитывает все навыки и условия потребности. Оценка
                  показывает сходство с требованиями.
                </p>
              </>
            )}
          </div>
          {!filterError && (
            <RemoteState
              {...remote}
              loading={remote.loading || (!!needId && needs.loading)}
              empty={remote.data?.items.length === 0}
              emptyTitle="Кандидаты не найдены"
              emptyDescription="Измените фильтры или вернитесь позже. Недавно открытые и приглашённые кандидаты временно скрыты."
            />
          )}
          {remote.data && (
            <>
              <p role="status" className="text-sm text-muted-foreground">
                Найдено кандидатов: {remote.data.total}
              </p>
              {recommendations?.items.map((candidate, index) => (
                <RecommendationCard
                  key={candidate.id}
                  candidate={candidate}
                  catalogs={catalogs}
                  position={offset + index + 1}
                  onOpen={() => setCandidateId(candidate.id)}
                />
              ))}
              {bank?.items.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  catalogs={catalogs}
                  onOpen={() => setCandidateId(candidate.id)}
                />
              ))}

              <PageControls
                offset={offset}
                count={remote.data.items.length}
                total={remote.data.total}
                pending={busy}
                onPage={setOffset}
              />
            </>
          )}
        </div>
      </div>
      {candidateId && !offer && (
        <CandidateDetails
          company={company}
          catalogs={catalogs}
          candidateId={candidateId}
          api={api}
          busy={busy}
          onClose={() => setCandidateId('')}
          onViewed={remote.retry}
          onOffer={() => setOffer(true)}
        />
      )}
      {candidateId && offer && (
        <OfferComposer
          company={company}
          candidateId={candidateId}
          api={api}
          need={selectedNeed}
          onBusyChange={busyChanged}
          onClose={() => setOffer(false)}
          onSent={() => {
            setOffer(false);
            setCandidateId('');
            remote.retry();
          }}
        />
      )}
    </>
  );
};
