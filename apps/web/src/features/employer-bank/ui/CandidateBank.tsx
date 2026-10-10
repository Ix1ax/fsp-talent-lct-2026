'use client';

import { useCallback, useState } from 'react';
import { SlidersHorizontalIcon } from 'lucide-react';

import { useRemoteData } from '@/shared/hooks';
import { cn } from '@/shared/lib/utils';
import {
  AsyncState,
  Badge,
  Button,
  PageControls,
  RemoteState,
} from '@/shared/ui';
import type { Catalogs, Skill } from '@/entities/catalog';
import type { Company } from '@/entities/company';
import {
  type BankFilters,
  type EmployerBankApi,
  validateBankFilters,
} from '@/entities/employer-bank';
import type {
  EmployerNeed,
  RecommendationPage,
} from '@/entities/employer-need';

import { filtersForNeed, filtersMatchNeed } from '../lib/filtersForNeed';
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

type SearchResults =
  | Awaited<ReturnType<EmployerBankApi['getBankCandidates']>>
  | RecommendationPage;

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
  const [filters, setFilters] = useState<BankFilters>({});
  const [experienceMin, setExperienceMin] = useState('');
  const [experienceMax, setExperienceMax] = useState('');
  const [offset, setOffset] = useState(0);
  const [candidateId, setCandidateId] = useState('');
  const [offer, setOffer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [referenceNeedId, setReferenceNeedId] = useState('');
  const needs = useRemoteData(loadNeeds, revision);
  const referenceNeed = needs.data?.find((need) => need.id === referenceNeedId);
  const experienceInvalid = [experienceMin, experienceMax].some(
    (value) =>
      value !== '' &&
      (!Number.isFinite(Number(value)) ||
        Number(value) < 0 ||
        Number(value) > 50),
  );

  const filterError = experienceInvalid
    ? 'Укажите опыт от 0 до 50 лет.'
    : validateBankFilters(filters);
  const selectedNeed =
    referenceNeed && !filterError && filtersMatchNeed(filters, referenceNeed)
      ? referenceNeed
      : undefined;

  const needId = selectedNeed?.id ?? '';
  const load = useCallback(
    (signal: AbortSignal) => {
      if (filterError) return Promise.reject(new Error(filterError));
      if (needId) {
        if (!selectedNeed)
          return Promise.reject(
            new Error(
              'Выбранная потребность недоступна. Выберите другую или сбросьте фильтры.',
            ),
          );
        return api.getNeedCandidates(
          company.id,
          needId,
          filters,
          offset,
          signal,
        );
      }
      return api.getBankCandidates(company.id, filters, offset, signal);
    },
    [api, company.id, filterError, filters, offset, needId, selectedNeed],
  );

  const remote = useRemoteData<SearchResults>(load);
  const change = (patch: Partial<BankFilters>) => {
    setFilters((value) => ({ ...value, ...patch }));
    setOffset(0);
  };
  const reset = () => {
    setReferenceNeedId('');
    setFilters({});
    setExperienceMin('');
    setExperienceMax('');
    setOffset(0);
  };

  const recommendations =
    remote.data && 'needId' in remote.data
      ? (remote.data as RecommendationPage)
      : null;
  const bank = remote.data && !('needId' in remote.data) ? remote.data : null;
  const busyChanged = useCallback(
    (value: boolean) => {
      setBusy(value);
      onBusyChange(value);
    },
    [onBusyChange],
  );

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
          className={cn(
            'min-w-0 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto',
            !filtersOpen && 'hidden lg:block',
          )}
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
          <div className="grid gap-3 rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
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
              {!remote.data.items.length && (
                <AsyncState
                  title="Кандидаты не найдены"
                  description="Измените фильтры или вернитесь позже."
                />
              )}
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
          }}
        />
      )}
    </>
  );
};
